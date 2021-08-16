import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as pipelines from "@aws-cdk/pipelines";

import { StaticSiteStage } from "./static-site-stage";

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipelineActions.GitHubSourceAction({
      owner: "vollmerr",
      repo: "poc-aws-cdk",
      branch: "main",
      actionName: "Github",
      output: sourceArtifact,
      oauthToken: cdk.SecretValue.secretsManager("github-token"),
    });

    const synthAction = new pipelines.SimpleSynthAction({
      cloudAssemblyArtifact,
      sourceArtifact,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      installCommands: ["npm install"],
      buildCommands: ["npm run test", "npm run build"],
      synthCommand: "npx cdk synth",
    });

    const pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
      cloudAssemblyArtifact,
      selfMutating: true,
      sourceAction,
      synthAction,
    });

    const deployStaging = new StaticSiteStage(this, "DeployStaging", {
      ...props,
      commitId: sourceAction.variables.commitId,
      targetEnv: "staging",
    });
    pipeline.addApplicationStage(deployStaging);

    const deployProd = new StaticSiteStage(this, "DeployProd", {
      ...props,
      commitId: sourceAction.variables.commitId,
      targetEnv: "production",
    });
    pipeline.addApplicationStage(deployProd);
  }
}
