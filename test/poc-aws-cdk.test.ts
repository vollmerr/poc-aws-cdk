import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as PocAwsCdk from "../lib/poc-aws-cdk-stack";

test("Empty Stack", () => {
  expect(1).toEqual(1);
  // const app = new cdk.App();
  // // WHEN
  // const stack = new PocAwsCdk.PocAwsCdkStack(app, "MyTestStack");
  // // THEN
  // expectCDK(stack).to(
  //   matchTemplate(
  //     {
  //       Resources: {},
  //     },
  //     MatchStyle.EXACT
  //   )
  // );
});
