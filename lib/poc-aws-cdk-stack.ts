import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";

const config = {
  github: {
    owner: "vollmerr",
    repo: "poc-aws-cdk",
  },
  s3: {
    bucketName: "11cms-staging",
  },
  cloudfront: {
    distributionId: "E1QGVGRXYXX8JZ",
  },
};

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.onPullRequest();
    this.onPullRequestMerged();
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
          GITHUB_REPO: { value: config.github.repo },
          S3_BUCKET: { value: config.s3.bucketName },
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
            GITHUB_REPO: { value: config.github.repo },
            S3_BUCKET: { value: config.s3.bucketName },
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
