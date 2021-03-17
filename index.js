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
    serviceName: 'graphql',
});

const jaegerExporterOptions = {
    serviceName: 'graphql'
}
const jaegerExporter = new JaegerExporter(jaegerExporterOptions);

const tracerProvider = new NodeTracerProvider({serviceName:'graphql'});
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

async function bootstrap() {
    try {
        const app = fastify({
            logger: {
                timestamp: pino.stdTimeFunctions.isoTime,
                useLevelLabels: true,
                level: 'silent'
            },
        });

        const port = 8080;
        const server = new ApolloServer({
            logger: pino({level:'silent'}),
            typeDefs,
            resolvers,
            introspection: true,
            context: (data) => {
           
                /**
                 * I would like to obtain a traceId
                 * at this point.
                 * 
                 * This context is passed to all
                 * GraphQL Operations and has the inbound
                 * request object
                 * 
                 * I would imagine it'd be possible
                 * to set the parent span here
                 * and then have a traceId that
                 * is te same as the GraphQL Operations
                 * that the "GraphQL.context" is forwarded to.
                 *
                */

                /**
                 * when using 0.11.0 of Otel
                 * I was able to obtain traceId from
                 * the following
                 * 
                 * const traceID: string = provider
                 *  ?.getTracer(process.env.TRACE_SERVICE_NAME)
                 *  ?.getCurrentSpan()
                 *  ?.context().traceId;
                 * 
                 * Notes say to now use
                 *  api.getSpan(api.context.active())
                 * 
                 * That gives me 'undefined'
                */


                // From @Daniel Dyla's reply on Slack:
                // https://cloud-native.slack.com/archives/C01NL1GRPQR/p1614783815111500?thread_ts=1614782006.111000&cid=C01NL1GRPQR

                //Code example
                span1 = api.trace.getTracerProvider('graphql').getTracer('graphql').startSpan('GraphQLContextSpan')

                let ctx = api.setSpan(api.context.active(), span1);
                api.context.with(ctx, () => {
                    const s = api.getSpan(api.context.active());
                    console.log('results', s === span1) 
                    /**
                     * Server started
                     * results false
                     * */
                })

                


                return {};
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



const resolvers = {
    Query: {
        getSimple(parent, args, context, info) {

            let symbolArray = Object.getOwnPropertySymbols(context)
            
            /**
             * query_span is the parent span of the GraphQL Operation
             * I learned I am able to obtain its Span & SpanContext
             * via `GraphQL.context` passed to each GraphQL Operation
             * 
             * Ideally, I would like to be able to obtain the traceId
             * for the resolvers in the `graphql.context` layer
             * one level up 
            */
            let query_span = context[symbolArray[1]]
            console.log({query_span})

            return {
                foo: 'I am foo!',
                bar: 'I am bar!'
            }
        }
    }
}


const typeDefs = gql`
type Response {
    foo: String
    bar: String
}
type Query {

    getSimple:Response

}
`



bootstrap();


