import {
  AtprotoWebDidDocumentResolver,
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";

export const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

export const handleResolver = new XrpcHandleResolver({
  serviceUrl: "https://public.api.bsky.app",
});
