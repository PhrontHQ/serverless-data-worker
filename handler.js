'use strict';

const AWS = require('aws-sdk');
// const globalGateway = new AWS.ApiGatewayManagementApi({
//   endpoint: process.env.APIG_ENDPOINT
// });

var Montage = require('montage/montage');
var PATH = require("path");
var OperationCoordinatorPromise;

//Load Montage and Phront dependencies 
OperationCoordinatorPromise = Montage.loadPackage(PATH.join(__dirname, "."), {
  mainPackageLocation: PATH.join(__filename, ".")
})
.then(function (mr) {
  return mr.async('phront/data/main.datareel/service/operation-coordinator');
})
.then(function (module) {
  global.OperationCoordinator = module.OperationCoordinator;
  console.log("OperationCoordinator ready");
  return new module.OperationCoordinator;
});

// the following section injects the new ApiGatewayManagementApi service
// into the Lambda AWS SDK, otherwise you'll have to deploy the entire new version of the SDK

/* START ApiGatewayManagementApi injection */
const { Service, apiLoader } = AWS

apiLoader.services['apigatewaymanagementapi'] = {}

const model = {
  metadata: {
    apiVersion: '2018-11-29',
    endpointPrefix: 'execute-api',
    signingName: 'execute-api',
    serviceFullName: 'AmazonApiGatewayManagementApi',
    serviceId: 'ApiGatewayManagementApi',
    protocol: 'rest-json',
    jsonVersion: '1.1',
    uid: 'apigatewaymanagementapi-2018-11-29',
    signatureVersion: 'v4'
  },
  operations: {
    PostToConnection: {
      http: {
        requestUri: '/@connections/{connectionId}',
        responseCode: 200
      },
      input: {
        type: 'structure',
        members: {
          Data: {
            type: 'blob'
          },
          ConnectionId: {
            location: 'uri',
            locationName: 'connectionId'
          }
        },
        required: ['ConnectionId', 'Data'],
        payload: 'Data'
      }
    }
  },
  paginators: {},
  shapes: {}
}

AWS.ApiGatewayManagementApi = Service.defineService('apigatewaymanagementapi', ['2018-11-29']);
Object.defineProperty(apiLoader.services['apigatewaymanagementapi'], '2018-11-29', {
  // eslint-disable-next-line
  get: function get() {
    return model
  },
  enumerable: true,
  configurable: true
});
/* END ApiGatewayManagementApi injection */


const sharedGateway = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIG_ENDPOINT,
  convertResponseTypes: false
});


module.exports.connect = (event, context, cb) => {
  cb(null, {
    statusCode: 200,
    body: 'Connected.'
  });
};

module.exports.disconnect = (event, context, cb) => {

  //operationCoordinator.unregisterGatewaygatewayForgatewayId(gateway,event.requestContext.connectionId);

  cb(null, {
    statusCode: 200,
    body: 'Disconnected.'
  });
};

module.exports.default = async (event, context, cb) => {
  // default function that just echos back the data to the gateway
  // const gateway = new AWS.ApiGatewayManagementApi({
  //   apiVersion: '2018-11-29',
  //   endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
  //   convertResponseTypes: false
  // });

  //console.log("default() EVENT: \n" + JSON.stringify(event));

  // console.log("sharedGateway endpoint is:", process.env.APIG_ENDPOINT);
  // console.log("localGateway endpoint is:", `https://${event.requestContext.domainName}/${event.requestContext.stage}`);

  const operationCoordinator  = await OperationCoordinatorPromise;

  await operationCoordinator.handleMessage(event, context, cb, sharedGateway);

  cb(null, {
    statusCode: 200,
    body: 'Sent.'
  });
  // var serializedHandledOperation = await operationCoordinator.handleMessage(event, context, cb, gateway);

  // //console.log("serializedHandledOperation: ",serializedHandledOperation);
  // try {

  //     await gateway
  //     .postToConnection({
  //       ConnectionId: event.requestContext.connectionId,
  //       Data: serializedHandledOperation
  //     })
  //     .promise()
  //     .then(function(resolved) {
  //       console.log(resolved);
  //     },function(rejected) {
  //       console.log(rejected);
  //     });

  //     //console.log("postToConnection done. ");

  //     cb(null, {
  //       statusCode: 200,
  //       body: 'Sent.'
  //     });
  // } catch (e) {
  //   console.error("Caught Error: ",e," e.statusCode is:"+e.statusCode );
  // }


};


module.exports.auth = async (event, context) => {
  // return policy statement that allows to invoke the connect function.
  // in a real world application, you'd verify that the header in the event
  // object actually corresponds to a user, and return an appropriate statement accordingly
  return {
    "principalId": "user",
    "policyDocument": {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": "execute-api:Invoke",
          "Effect": "Allow",
          "Resource": event.methodArn
        }
      ]
    }
  };
};

