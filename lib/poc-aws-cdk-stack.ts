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

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // const sourceArtifact = new codepipeline.Artifact();
    // const cloudAssemblyArtifact = new codepipeline.Artifact();

    // const sourceAction = new codepipelineActions.GitHubSourceAction({
    //   owner: "vollmerr",
    //   repo: "poc-aws-cdk",
    //   branch: "main",
    //   actionName: "Github",
    //   output: sourceArtifact,
    //   oauthToken: cdk.SecretValue.secretsManager("github-token"),
    // });

    // const synthAction = new pipelines.SimpleSynthAction({
    //   cloudAssemblyArtifact,
    //   sourceArtifact,
    //   environment: {
    //     buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
    //     privileged: true,
    //   },
    //   installCommands: ["npm install"],
    //   buildCommands: ["npm run test", "npm run build"],
    //   synthCommand: "npx cdk synth",
    // });

    // const pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
    //   cloudAssemblyArtifact,
    //   selfMutating: true,
    //   sourceAction,
    //   synthAction,
    // });

    // const deployStaging = new StaticSiteStage(this, "DeployStaging", {
    //   ...props,
    //   subdomain: "staging",
    // });
    // pipeline.addApplicationStage(deployStaging);

    // const deployProd = new StaticSiteStage(this, "Deploy", props);
    // pipeline.addApplicationStage(deployProd);

    const bucket = s3.Bucket.fromBucketName(this, "SiteBucket", "11os-staging");

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI",
      {
        comment: `OAI for ${id}`,
      }
    );

    // on pull request
    const prSource = codebuild.Source.gitHub({
      owner: "vollmerr",
      repo: "poc-aws-cdk",
      reportBuildStatus: true,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_CREATED,
          codebuild.EventAction.PULL_REQUEST_UPDATED,
          codebuild.EventAction.PULL_REQUEST_REOPENED
        ),
      ],
    });

    const prProject = new codebuild.Project(this, "portal-system-pr", {
      source: prSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        "./buildspecs/branch-pr.yaml"
      ),
    });

    prProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*", "s3:Put*"],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        resources: [bucket.arnForObjects("*")],
      })
    );

    // on merge pull request
    const mergeSource = codebuild.Source.gitHub({
      owner: "eleven-software",
      repo: "portal-api",
      reportBuildStatus: false,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_MERGED
        ),
      ],
    });

    const mergeProject = new codebuild.Project(this, "portal-system-pr-merge", {
      source: mergeSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        "./buildspecs/branch-cleanup.yaml"
      ),
    });

    mergeProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*", "s3:Put*"],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        resources: [bucket.arnForObjects("*")],
      })
    );
  }
}

// merge to main
//    deploy to staging/portal-system/main

// create/update branch
//    deploy to staging/portal-system/branch-name

// delete branch
//    delete staging/portal-system/branch-name
