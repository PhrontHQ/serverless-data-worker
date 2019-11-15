'use strict';

const AWS = require('aws-sdk')
var Montage = require('montage/montage');
var PATH = require("path");
global.XMLHttpRequest = require('xhr2');
var OperationCoordinatorPromise;

// //From Montage
// Load package
OperationCoordinatorPromise = Montage.loadPackage(PATH.join(__dirname, "."), {
  mainPackageLocation: PATH.join(__filename, ".")
})
.then(function (mr) {
  return mr.async('phront-data/data/main.datareel/service/operation-coordinator');
})
.then(function (module) {
  global.OperationCoordinator = module.OperationCoordinator;
  console.log("mr.then -> OperationCoordinator is ",global.OperationCoordinator);
  return new module.OperationCoordinator;
  /*
  var event = {
    body:"{\"time\":1573629491196,\"creationIndex\":0,\"type\":{\"isRead\":true},\"objectDescriptor\":\"data/main.datareel/model/collection\",\"id\":\"2CDAFBED-F0F0-429A-800D-67472E10AEF2\"}"
  };

  var operation = JSON.parse(event.body),
  objectDescriptorModuleId = operation.objectDescriptor,
  objectDescriptor = global.PhrontService.objectDescriptorForObjectDescriptorModuleId(objectDescriptorModuleId);
  

  operation.objectDescriptor = objectDescriptor;

  global.PhrontService.handleReadOperation(operation) 
  .then(function(readUpdatedOperation) {
    console.log("readUpdatedOperation",readUpdatedOperation);
    var records = readUpdatedOperation.data;
    readUpdatedOperation.referrerId = operation.id;

  });
*/

});


async function processEvent(event, context) {
    /*
    "{"time":1573623761704,"creationIndex":0,"type":{"isRead":true},"objectDescriptor":"data/main.datareel/model/collection","id":"3B3E5193-009A-4BFE-97BF-0290536E24D9"}"
    */

  const operationCoordinator  = await OperationCoordinatorPromise;
  var operation = JSON.parse(event.body),
  objectDescriptorModuleId = operation.objectDescriptor,
  objectDescriptor = phrontService.objectDescriptorWithModuleId(objectDescriptorModuleId);
  
  operation.objectDescriptor = objectDescriptor;

  console.log("objectDescriptor is ",objectDescriptor);
  console.log("operation is ",operation);


  return phrontService.handleReadOperation(operation) 
  .then(function(readUpdatedOperation) {
    var records = readUpdatedOperation.data;
    console.log("readUpdatedOperation",readUpdatedOperation,records);
    //Having the whole objectDescriptor here creates a circular issue using simple JSON.stringify
    readUpdatedOperation.objectDescriptor = readUpdatedOperation.objectDescriptor.module.id;

    readUpdatedOperation.referrer = operation.id;
    return readUpdatedOperation;
  });
}


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

AWS.ApiGatewayManagementApi = Service.defineService('apigatewaymanagementapi', ['2018-11-29'])
Object.defineProperty(apiLoader.services['apigatewaymanagementapi'], '2018-11-29', {
  // eslint-disable-next-line
  get: function get() {
    return model
  },
  enumerable: true,
  configurable: true
})
/* END ApiGatewayManagementApi injection */

module.exports.connect = (event, context, cb) => {
  cb(null, {
    statusCode: 200,
    body: 'Connected.'
  });
};

module.exports.disconnect = (event, context, cb) => {
  cb(null, {
    statusCode: 200,
    body: 'Disconnected.'
  });
};

module.exports.default = async (event, context, cb) => {
  // default function that just echos back the data to the client
  const client = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  // console.log("EVENT: \n" + JSON.stringify(event));
  const operationCoordinator  = await OperationCoordinatorPromise
  var serializedHandledOperation = await operationCoordinator.handleEvent(event, context);

  //console.log("readUpdatedOperation: ",readUpdatedOperation);
  await client
  .postToConnection({
    ConnectionId: event.requestContext.connectionId,
    Data: serializedHandledOperation
  })
  .promise();

  cb(null, {
    statusCode: 200,
    body: 'Sent.'
  });


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

