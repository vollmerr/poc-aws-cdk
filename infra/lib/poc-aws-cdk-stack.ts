import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as iam from "@aws-cdk/aws-iam";
import * as pipelines from "@aws-cdk/pipelines";
import * as route53 from "@aws-cdk/aws-route53";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

import { PocAwsCdkStage } from "./poc-aws-cdk-stage";
import { FunctionCode } from "@aws-cdk/aws-cloudfront";

const CLOUDFRONT_DISTRO_ID = "E1DHN5VLWL9KS9";
const GITHUB_REPO = "poc-aws-cdk";
const GITHUB_OWNER = "vollmerr";
const S3_BUCKET = "poc-aws-cdk";
const DOMAIN = "vollmerr.com";
const APPS = ["app-one", "app-two"];

const convertArrayForBash = (array: Array<string>) =>
  array.toString().replace(",", " ");

const getBuildSpec = (name: string) => `./infra/buildspecs/${name}`;

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.onMergeMain();
    this.onPullRequest();
    this.onPullRequestMerged();
  }

  // base policy for running codebuild
  private getCodeBuildBasePolicy() {
    return new iam.PolicyStatement({
      actions: [
        "cloudfront:CreateInvalidation",
        "s3:DeleteObject*",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*",
        "s3:Put*",
        "secretsmanager:GetSecretValue",
      ],
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:aws:cloudfront::${this.account}:*`,
        "arn:aws:s3:::*",
        "arn:aws:secretsmanager:*:*:secret:GITHUB_PACKAGES*",
      ],
    });
  }

  private onMergeMain() {
    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipeline = new pipelines.CdkPipeline(this, "portalSystemMergeMain", {
      cloudAssemblyArtifact: cloudAssemblyArtifact,
      selfMutating: true,
      sourceAction: new codepipeline_actions.CodeStarConnectionsSourceAction({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: "main",
        actionName: "Github",
        output: sourceArtifact,
        codeBuildCloneOutput: true,
        connectionArn:
          "arn:aws:codestar-connections:us-west-2:489354756207:connection/a25709ec-fd25-469d-9de7-ce50d961f883",
      }),
      synthAction: new pipelines.SimpleSynthAction({
        cloudAssemblyArtifact: cloudAssemblyArtifact,
        sourceArtifact: sourceArtifact,
        synthCommand: "npx cdk synth",
      }),
    });

    new cloudfront.Function(this, "redirect-to-index", {
      code: FunctionCode.fromFile({ filePath: "./infra/lib/redirect-to-index.ts" }),
    });

    const staging = pipeline.addStage("staging");

    const project = new codebuild.PipelineProject(this, "staging", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        getBuildSpec("pull-request.yml")
      ),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        environmentVariables: {
          CLOUDFRONT_DISTRO_ID: { value: CLOUDFRONT_DISTRO_ID },
          DOMAIN: { value: DOMAIN },
          GITHUB_REPO: { value: GITHUB_REPO },
          S3_BUCKET: { value: S3_BUCKET },
          APPS: { value: convertArrayForBash(APPS) },
          TARGET_BRANCH: { value: "staging" },
        },
        privileged: true,
      },
    });

    const action = new codepipeline_actions.CodeBuildAction({
      actionName: "staging",
      project,
      input: sourceArtifact,
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
    staging.addActions(action);
  }

  private getPipelineStageStaging() {
    // const domainName = "vollmerr.com";
    // /**
    //  * zone distribution is hosted in, cannot be in nested stack so passed in
    //  * https://github.com/aws-samples/aws-cdk-examples/issues/238
    //  */
    // const zone = route53.HostedZone.fromLookup(this, "Zone", { domainName });
    // return new PocAwsCdkStage(this, "staging", { domainName, zone });
  }

  // actions to take on pull request
  private onPullRequest() {
    const source = codebuild.Source.gitHub({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
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
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        getBuildSpec("pull-request.yml")
      ),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        environmentVariables: {
          CLOUDFRONT_DISTRO_ID: { value: CLOUDFRONT_DISTRO_ID },
          DOMAIN: { value: DOMAIN },
          GITHUB_REPO: { value: GITHUB_REPO },
          S3_BUCKET: { value: S3_BUCKET },
          APPS: { value: convertArrayForBash(APPS) },
        },
        privileged: true,
      },
      source,
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }

  // actions to take on pull request merged
  private onPullRequestMerged() {
    const source = codebuild.Source.gitHub({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
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
        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          getBuildSpec("pull-request-merged.yml")
        ),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          environmentVariables: {
            GITHUB_REPO: { value: GITHUB_REPO },
            S3_BUCKET: { value: S3_BUCKET },
          },
          privileged: true,
        },
        source,
      }
    );

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }
}
