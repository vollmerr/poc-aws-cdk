This is the infrastructure for the portal-system, hosted in AWS. It uses (aws cdk)[https://aws.amazon.com/cdk/] for managing its infrastructure as code.

There are existing resources in AWS that do not need to be created but instead modified. Unfortunately there is no way to update only create for some of these operations, so manual configuration must happen in AWS as follows:

1. Add a behaviour to cloudfront
    - go to the cloudfront distribution with the id configured (CLOUDFRONT_DISTRO_ID)
    - click on the `Behaviors` tab
    - click `Create Behavior` to add 
        - enter the `Path pattern` as `/portal-system/*`
        - select `Redirect HTTP to HTTPS` for the `Viewer protocol policy`
        - select `CORS-S3Origin` for the `Origin request policy`
        - in `Function associations` on `Viewer request`:
            - select `Cloudfront Functions` for `Function Type`
            - select the `redirect-to-index` name that was generated for `Function ARN/Name` 
        - click `Create Behavior`
