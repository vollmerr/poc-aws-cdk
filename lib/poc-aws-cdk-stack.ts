import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";

const CLOUDFRONT_DISTRO_ID = "E1QGVGRXYXX8JZ";
const GITHUB_REPO = "poc-aws-cdk";
const GITHUB_OWNER = "vollmerr";
const S3_BUCKET = "poc-aws-cdk";
const DOMAIN = "staging.vollmerr.com";
const APPS = ["app-one", "app-two"];

const getBuildSpec = (name: string) => `./infra/buildspecs/${name}`;

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

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
          APPS: { value: APPS },
        },
        privileged: true,
      },
      source,
    });

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy as any);
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
            CLOUDFRONT_DISTRO_ID: { value: CLOUDFRONT_DISTRO_ID },
            DOMAIN: { value: DOMAIN },
            GITHUB_REPO: { value: GITHUB_REPO },
            S3_BUCKET: { value: S3_BUCKET },
            APPS: { value: APPS },
          },
          privileged: true,
        },
        source,
      }
    );

    const codeBuildPolicy = this.getCodeBuildBasePolicy();
    project.addToRolePolicy(codeBuildPolicy as any);
  }
}
