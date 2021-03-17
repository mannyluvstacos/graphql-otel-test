/* eslint-disable no-console */

/**
 * Opentelemetry Wiring
 */
const api = require('@opentelemetry/api')
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { GrpcInstrumentation } = require('@opentelemetry/instrumentation-grpc');
const { GraphQLInstrumentation } = require('@opentelemetry/instrumentation-graphql');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');


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


const { ApolloServer, gql } = require('apollo-server-fastify');
const fastify = require('fastify');
const pino = require('pino');


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


