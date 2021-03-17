/* eslint-disable no-console */

/**
 * Opentelemetry Wiring
 */
import * as api from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { NodeTracerProvider } from '@opentelemetry/node';
import { SimpleSpanProcessor } from '@opentelemetry/tracing'
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';


const zipkinExporter = new ZipkinExporter({
    serviceName: process.env.TRACE_SERVICE_NAME,
    url: process.env.TRACE_URL
});

const jaegerExporterOptions = {
    serviceName: process.env.TRACE_SERVICE_NAME
}
const jaegerExporter = new JaegerExporter(jaegerExporterOptions);

const tracerProvider = new NodeTracerProvider();
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(zipkinExporter));
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));
const globalTracerProvider = api.trace.setGlobalTracerProvider(tracerProvider);

const grpcInstrumentation = new GrpcInstrumentation({});
const graphQLInstrumentation = new GraphQLInstrumentation({
    depth: 3,
    mergeItems: true
})

registerInstrumentations({
    tracerProvider,
    instrumentations: [
        grpcInstrumentation,
        graphQLInstrumentation,
    ],
});
/**
 * End of Opentelemetry Wiring
 */


import { ApolloServer, gql } from 'apollo-server-fastify';
import fastify from 'fastify';
import pino from 'pino';


const resolvers = {
    Query: {
    getSimple(parent, args, context, info) {

        console.log({ context })

        return {
            foo: 'I am foo!',
            bar: 'I am bar!'
        }
    }
}}


const typeDefs = gql`
type Response {
    foo: String
    bar: String
}
type Query {

    getSimple:Response

}
`

async function bootstrap() {
    try {
        const app = fastify({
            logger: {
                timestamp: pino.stdTimeFunctions.isoTime,
                useLevelLabels: true,
            },
        });

        const port = 8080;
        const server = new ApolloServer({
            logger: app.log,
            typeDefs,
            resolvers,
            introspection: true,
            context: ({ req }) => {
               

                return { req };
            },
        });
        app.register(
            server.createHandler({
                cors: {
                    origin: '*'
                },
            })
        );

        await app.listen({ port }, () => {
            console.log('Server started');
        });
    } catch (error) {
        console.error('Startup Error', error);
        throw error;
    }
}


bootstrap();


