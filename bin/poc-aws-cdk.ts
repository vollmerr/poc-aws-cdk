#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { PocAwsCdkStack } from "../lib/poc-aws-cdk-stack";

const app = new cdk.App();

new PocAwsCdkStack(app, "PocAwsCdkStack", {
  env: { account: "725107151777", region: "us-east-1" },
});
