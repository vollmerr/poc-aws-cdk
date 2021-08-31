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

    this.initializeResources();
    this.onPullRequest();
    this.onPullRequestMerged();
    this.onMainMerged();
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

  private getCodebuildOnMergeSource(
    overrides: Partial<codebuild.GitHubSourceProps> = {}
  ) {
    return codebuild.Source.gitHub({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      reportBuildStatus: false,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_MERGED
        ),
      ],
      ...overrides,
    });
  }

  private getCodebuildOnPullRequestSource(
    overrides: Partial<codebuild.GitHubSourceProps> = {}
  ) {
    return codebuild.Source.gitHub({
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
      ...overrides,
    });
  }

  private initializeResources() {
    new cloudfront.Function(this, "redirect-to-index", {
      code: FunctionCode.fromFile({
        filePath: "./infra/lib/redirect-to-index.js",
      }),
    });
  }

  // actions to take on pull request
  private onPullRequest(targetBranch: string = "") {
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
          TARGET_BRANCH: { value: targetBranch },
        },
        privileged: true,
      },
      source: this.getCodebuildOnPullRequestSource(),
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }

  // actions to take on pull request merged
  private onPullRequestMerged() {
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
        source: this.getCodebuildOnMergeSource(),
      }
    );

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }

  private onMainMerged() {
    const project = new codebuild.Project(this, "portalSystemMainMerged", {
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
          TARGET_BRANCH: { value: "main" },
        },
        privileged: true,
      },
      source: this.getCodebuildOnMergeSource({
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(
            codebuild.EventAction.PULL_REQUEST_MERGED
          ).andBranchIs("main"),
        ],
      }),
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy);
  }
}
