import * as cdk from "@aws-cdk/core";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as iam from "@aws-cdk/aws-iam";
import * as route53 from "@aws-cdk/aws-route53";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as targets from "@aws-cdk/aws-route53-targets";

export type StaticSiteStackProps = {
  /** name of the domain being distributed to */
  domainName: string;
  /** name of the domain being distributed to */
  targetEnv: string;
  /** name of the domain being distributed to */
  targetApp: string;
  /** zone distribution is hosted in  */
  zone: route53.IHostedZone;
} & cdk.StackProps;

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    // Create the bucket to host the web site.
    const webAppBucket = new s3.Bucket(this, "SiteBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: `${props.targetApp}-${props.targetEnv}`,
    });

    // Create the Origin Access Identity for the S3 Policy.
    const cloudFrontOia = new cf.OriginAccessIdentity(this, "SiteOIA", {
      comment: `OIA for ${props.targetApp} in ${props.targetEnv}`,
    });

    // Create the Policy Document to grant access to the S3 bucket from CloudFront.
    const cfPolicy = new iam.PolicyStatement({
      actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
      resources: [webAppBucket.arnForObjects("*")],
      principals: [
        new iam.CanonicalUserPrincipal(
          cloudFrontOia.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    });
    webAppBucket.addToResourcePolicy(cfPolicy);

    // Create the Web Distribution.
    const distribution = new cf.CloudFrontWebDistribution(
      this,
      "SiteDistribution",
      {
        originConfigs: [
          {
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
            s3OriginSource: {
              originAccessIdentity: cloudFrontOia,
              s3BucketSource: webAppBucket,
            },
          },
        ],
      }
    );

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, "SiteAliasRecord", {
      recordName: `www.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      zone: props.zone,
    });

    // Deploy the website.
    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset(`${props.targetApp}/build`)],
      destinationBucket: webAppBucket,
    });
  }
}
