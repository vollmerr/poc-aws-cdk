import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as pipelines from "@aws-cdk/pipelines";

import { StaticSiteStage } from "./static-site-stage";

// const domain = "guestinternet.com";
// const bucket = "11cms-staging";
// const url = "https://11cms-staging.guestinternet.com/";
// const final = "https://11cms-staging.guestinternet.com/portal-system/main/...";
// const branch =
//   "https://11cms-staging.guestinternet.com/portal-system/vollmerr-test-stuff/...";

const config = {
  github: {
    owner: "vollmerr",
    repo: "poc-aws-cdk",
  },
  s3: {
    bucketName: "11os-staging",
  },
  cloudfront: {
    distributionId: "E1QGVGRXYXX8JZ",
  },
  route53: {
    subdomain: "staging",
    domain: "vollmerr.com",
  },
};

/**
 * Targets following existing resources:
 * - github repo (config.github.*)
 * - s3 bucket (config.s3.bucketName) -> requires public access
 * - cloudfront distribution (config.cloudfront.distributionId)
 */
export class PocAwsCdkStack extends cdk.Stack {
  // private distributionId: string;

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.initializeResources(id);
    this.onPullRequest();
    this.onPullRequestMerged();
  }

  // initializes a s3 bucket (existing one) with cloudfront access
  private initializeResources(id: string) {
    // const subdomainName = config.route53.subdomain
    //   ? `${config.route53.subdomain}.`
    //   : "";
    // const domainName = `www.${subdomainName}${config.route53.domain}`;
    // const zone = route53.HostedZone.fromLookup(this, "Zone", {
    //   domainName: config.route53.domain,
    // });

    // const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, "OAI", {
    //   comment: `OAI for ${id}`,
    // });

    const bucket = s3.Bucket.fromBucketName(
      this,
      "SiteBucket",
      config.s3.bucketName
    );
    bucket.grantPublicAccess();

    // const bucketPolicy = new iam.PolicyStatement({
    //   actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
    //   // principals: [
    //   //   new iam.CanonicalUserPrincipal(
    //   //     cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    //   //   ),
    //   // ],
    //   principals: [new iam.AnyPrincipal()],

    //   resources: [bucket.arnForObjects("*")],
    // });

    // bucket.addToResourcePolicy(bucketPolicy);

    // // TLS certificate
    // const { certificateArn } = new acm.DnsValidatedCertificate(
    //   this,
    //   "SiteCertificate",
    //   {
    //     domainName,
    //     hostedZone: zone,
    //     region: "us-east-1", // Cloudfront only checks this region for certificates.
    //   }
    // );

    // // Specifies you want viewers to use HTTPS & TLS v1.1 to request your objects
    // const viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
    //   {
    //     certificateArn,
    //     env: {
    //       account: cdk.Aws.ACCOUNT_ID,
    //       region: cdk.Aws.REGION,
    //     },
    //     metricDaysToExpiry: () =>
    //       new cloudwatch.Metric({
    //         metricName: "TLS Viewer Certificate Expired",
    //         namespace: "TLS Viewer Certificate Validity",
    //       }),
    //     node: this.node,
    //     stack: this,
    //   },
    //   {
    //     aliases: [domainName],
    //     securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
    //     sslMethod: cloudfront.SSLMethod.SNI,
    //   }
    // );

    // // CloudFront distribution
    // const distribution = new cloudfront.CloudFrontWebDistribution(
    //   this,
    //   "SiteDistribution",
    //   {
    //     originConfigs: [
    //       {
    //         behaviors: [
    //           {
    //             allowedMethods:
    //               cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
    //             compress: true,
    //             isDefaultBehavior: true,
    //           },
    //         ],
    //         s3OriginSource: {
    //           originAccessIdentity: cloudfrontOAI,
    //           s3BucketSource: bucket,
    //         },
    //       },
    //     ],
    //     viewerCertificate,
    //   }
    // );

    // // Route53 alias record for the CloudFront distribution
    // new route53.ARecord(this, "SiteAliasRecord", {
    //   recordName: domainName,
    //   target: route53.RecordTarget.fromAlias(
    //     new targets.CloudFrontTarget(distribution)
    //   ),
    //   zone,
    // });

    // this.distributionId = distribution.distributionId;
  }

  // base policy for running codebuild
  private getCodeBuildBasePolicy() {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cloudfront:CreateInvalidation",
        "s3:DeleteObject*",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*",
        "s3:Put*",
        "secretsmanager:GetSecretValue",
      ],
      resources: [
        `arn:aws:cloudfront::${this.account}:*`,
        "arn:aws:s3:::*",
        "arn:aws:secretsmanager:*:*:secret:GITHUB_PACKAGES*",
      ],
    });
  }

  // actions to take on pull request
  private onPullRequest() {
    const source = codebuild.Source.gitHub({
      owner: config.github.owner,
      repo: config.github.repo,
      reportBuildStatus: true,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_CREATED,
          codebuild.EventAction.PULL_REQUEST_UPDATED,
          codebuild.EventAction.PULL_REQUEST_REOPENED
        ),
      ],
    });

    const project = new codebuild.Project(this, "portalSystemPullRequest", {
      source,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        environmentVariables: {
          CLOUDFRONT_DISTRO_ID: { value: config.cloudfront.distributionId },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        "./buildspecs/pull-request.yml"
      ),
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }

  // actions to take on pull request merged
  private onPullRequestMerged() {
    const source = codebuild.Source.gitHub({
      owner: config.github.owner,
      repo: config.github.repo,
      reportBuildStatus: false,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_MERGED
        ),
      ],
    });

    const project = new codebuild.Project(
      this,
      "portalSystemPullRequestMerged",
      {
        source,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          privileged: true,
          environmentVariables: {
            CLOUDFRONT_DISTRO_ID: { value: config.cloudfront.distributionId },
          },
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          "./buildspecs/pull-request-merged.yml"
        ),
      }
    );

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }
}
