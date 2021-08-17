import * as cdk from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as acm from "@aws-cdk/aws-certificatemanager";

export type StaticSiteConstructProps = {
  subdomain?: string;
};

export class StaticSiteConstruct extends cdk.Construct {
  public readonly StackName: string;
  constructor(parent: cdk.Stack, id: string, props: StaticSiteConstructProps) {
    super(parent, id);

    const { subdomain } = props;
    const domainName = "vollmerr.com";
    const domainPrefix = subdomain ? `${subdomain}.` : "";
    const domainPostfix = subdomain ? `.${subdomain}` : "";
    const siteDomain = `www.${domainPrefix}${domainName}`;
    const zone = route53.HostedZone.fromLookup(this, "Zone", { domainName });

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI",
      {
        comment: `OAI for ${id}`,
      }
    );
    new cdk.CfnOutput(this, "Site", { value: `https://${siteDomain}` });

    const siteBucket = s3.Bucket.fromBucketName(
      this,
      "SiteBucket",
      `poc-aws-cdk${domainPostfix}`
    );

    // // Content bucket - uncomment for initial deploy
    // const siteBucket = new s3.Bucket(this, "SiteBucket", {
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   bucketName: `poc-aws-cdk`,
    //   publicReadAccess: false,
    //   websiteIndexDocument: "index.html",
    //   versioned: true,
    // });

    // Grant access to cloudfront
    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        resources: [siteBucket.arnForObjects("*")],
      })
    );
    new cdk.CfnOutput(this, "Bucket", { value: siteBucket.bucketName });

    // TLS certificate
    const { certificateArn } = new acm.DnsValidatedCertificate(
      this,
      "SiteCertificate",
      {
        domainName: siteDomain,
        hostedZone: zone,
        region: "us-east-1", // Cloudfront only checks this region for certificates.
      }
    );
    new cdk.CfnOutput(this, "Certificate", { value: certificateArn });

    // Specifies you want viewers to use HTTPS & TLS v1.1 to request your objects
    const viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
      {
        certificateArn,
        env: {
          account: cdk.Aws.ACCOUNT_ID,
          region: cdk.Aws.REGION,
        },
        metricDaysToExpiry: () =>
          new cloudwatch.Metric({
            metricName: "TLS Viewer Certificate Expired",
            namespace: "TLS Viewer Certificate Validity",
          }),
        node: this.node,
        stack: parent,
      },
      {
        aliases: [siteDomain],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
        sslMethod: cloudfront.SSLMethod.SNI,
      }
    );

    // CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "SiteDistribution",
      {
        originConfigs: [
          {
            behaviors: [
              {
                allowedMethods:
                  cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                compress: true,
                isDefaultBehavior: true,
              },
            ],
            s3OriginSource: {
              originAccessIdentity: cloudfrontOAI,
              s3BucketSource: siteBucket,
            },
          },
        ],
        viewerCertificate,
      }
    );
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, "SiteAliasRecord", {
      recordName: siteDomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      zone,
    });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      sources: [s3deploy.Source.asset("./build")],
    });
  }
}
