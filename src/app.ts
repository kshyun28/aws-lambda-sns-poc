import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SNS } from '@aws-sdk/client-sns';

const sns = new SNS();

interface TransactionReceipt {
  blockHash: string;
  blockNumber: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  logs?: (LogsEntity | null)[] | null;
  logsBloom: string;
  status: string;
  to: string;
  transactionHash: string;
  transactionIndex: string;
  type: string;
}

interface LogsEntity {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics?: (string)[] | null;
  transactionHash: string;
  transactionIndex: string;
}

/**
 * Send message to SNS topic.
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Origin': '*',
  };
  let response: APIGatewayProxyResult;

  try {
    if (!event.body) throw new Error('Request body is undefined');
    const transactionReceipts: TransactionReceipt[] = JSON.parse(event.body);
    console.log('Matched transaction receipts', transactionReceipts);

    const transactionHashes = transactionReceipts.map((transactionReceipt) => {
      return `https://etherscan.io/tx/${transactionReceipt.transactionHash}`
    });

    await sns.publish({
      Message: transactionHashes.join('\n'),
      Subject: 'Alert for USDT/USDC transfer!',
      TopicArn: process.env.SNS_TOPIC_ARN,
    });

    response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Sent message to SNS topic.',
      }),
    };
  } catch (error: unknown) {
    console.error('Error', { error });
    const message = error instanceof Error ? error.message : 'Failed to send message to SNS topic.';
    response = {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message,
      }),
    };
  }

  return response;
};
