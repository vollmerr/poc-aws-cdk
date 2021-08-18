import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
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
};

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for ${id}`,
    });

    const bucket = s3.Bucket.fromBucketName(
      this,
      "SiteBucket",
      config.s3.bucketName
    );
    const bucketPolicy = new iam.PolicyStatement({
      actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
      principals: [
        new iam.CanonicalUserPrincipal(
          cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
      resources: [bucket.arnForObjects("*")],
    });
    bucket.addToResourcePolicy(bucketPolicy);

    // on pull request
    const prSource = codebuild.Source.gitHub({
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

    const prProject = new codebuild.Project(this, "portalSystemPr", {
      source: prSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        "./buildspecs/pull-request.yml"
      ),
    });

    const codeBuildPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "secretsmanager:GetSecretValue",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:DeleteObject*",
        "s3:List*",
        "s3:Put*",
      ],
      resources: [
        "arn:aws:secretsmanager:*:*:secret:GITHUB_PACKAGES*",
        "arn:aws:s3:::*",
      ],
    });

    prProject.addToRolePolicy(codeBuildPolicy);

    // on merge pull request
    const mergeSource = codebuild.Source.gitHub({
      owner: config.github.owner,
      repo: config.github.repo,
      reportBuildStatus: false,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_MERGED
        ),
      ],
    });

    const mergeProject = new codebuild.Project(this, "portalSystemPrMerged", {
      source: mergeSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        "./buildspecs/pull-request-merged.yml"
      ),
    });

    mergeProject.addToRolePolicy(codeBuildPolicy);
  }
}

// merge to main
//    deploy to staging/portal-system/main

// create/update branch
//    deploy to staging/portal-system/branch-name

// delete branch
//    delete staging/portal-system/branch-name
