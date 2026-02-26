import type { LexiconDoc } from "@atcute/lexicon-doc";

const stratosDefs: LexiconDoc = {
  lexicon: 1,
  id: "app.stratos.defs",
  defs: {
    source: {
      type: "object",
      description:
        "Indicates this record requires hydration from an external service. The stub record on the PDS contains minimal data; full content is fetched from the service endpoint.",
      required: ["vary", "subject", "service"],
      properties: {
        vary: {
          type: "string",
          description:
            "Indicates when hydration is needed. 'authenticated' means full content requires viewer authentication.",
          knownValues: ["authenticated", "unauthenticated"],
        },
        subject: {
          type: "ref",
          ref: "#subjectRef",
          description: "Reference to the full record at the hydration service.",
        },
        service: {
          type: "string",
          format: "did",
          description:
            "DID of the hydration service, optionally with fragment identifying the service entry (e.g., 'did:plc:abc123#atproto_pns').",
        },
      },
    },
    subjectRef: {
      type: "object",
      description: "A strong reference to a record, including its content hash for verification.",
      required: ["uri", "cid"],
      properties: {
        uri: {
          type: "string",
          format: "at-uri",
          description: "AT-URI of the record at the hydration service.",
        },
        cid: {
          type: "string",
          format: "cid",
          description: "CID of the full record content for integrity verification.",
        },
      },
    },
  },
};

const boundaryDefs: LexiconDoc = {
  lexicon: 1,
  id: "app.stratos.boundary.defs",
  defs: {
    Domain: {
      type: "object",
      description: "A specific domain to define exposure boundary.",
      required: ["value"],
      properties: {
        value: {
          type: "string",
          description: "Domain identifier for boundary. Must be a valid domain name.",
          maxLength: 253,
        },
      },
    },
    Domains: {
      type: "object",
      description: "A collection of domains that define the exposure boundary for a record.",
      required: ["values"],
      properties: {
        values: {
          type: "array",
          description: "List of domains that can access this record.",
          items: { type: "ref", ref: "#Domain" },
          maxLength: 10,
        },
      },
    },
  },
};

const actorEnrollment: LexiconDoc = {
  lexicon: 1,
  id: "app.stratos.actor.enrollment",
  defs: {
    main: {
      type: "record",
      description:
        "A profile record indicating the user is enrolled in a Stratos service. Published to the user's PDS during OAuth enrollment for endpoint discovery by AppViews.",
      key: "literal:self",
      record: {
        type: "object",
        required: ["service", "createdAt"],
        properties: {
          service: {
            type: "string",
            format: "uri",
            description:
              "The Stratos service endpoint URL where this user's private data is stored.",
          },
          boundaries: {
            type: "array",
            description: "List of boundaries the user has access to on this Stratos service.",
            items: {
              type: "ref",
              ref: "app.stratos.boundary.defs#Domain",
            },
            maxLength: 50,
          },
          createdAt: {
            type: "string",
            format: "datetime",
            description: "Timestamp when the enrollment was created.",
          },
        },
      },
    },
  },
};

const feedPost: LexiconDoc = {
  lexicon: 1,
  id: "app.stratos.feed.post",
  defs: {
    main: {
      type: "record",
      description:
        "Record containing a private Stratos post with domain boundary restrictions. When stored on user's PDS as a stub, only 'source' and 'createdAt' are present. Full content is available from the hydration service.",
      key: "tid",
      record: {
        type: "object",
        required: ["createdAt"],
        properties: {
          source: {
            type: "ref",
            ref: "app.stratos.defs#source",
            description:
              "When present, indicates this is a stub record. Full content should be hydrated from the referenced service.",
          },
          text: {
            type: "string",
            maxLength: 3000,
            maxGraphemes: 300,
            description:
              "The primary post content. May be an empty string, if there are embeds. Omitted in stub records.",
          },
          boundary: {
            type: "union",
            description: "Limit exposure to defined domains. Omitted in stub records.",
            refs: ["app.stratos.boundary.defs#Domains"],
          },
          facets: {
            type: "array",
            description: "Annotations of text (mentions, URLs, hashtags, etc)",
            items: { type: "ref", ref: "app.bsky.richtext.facet" },
          },
          reply: { type: "ref", ref: "#replyRef" },
          embed: {
            type: "union",
            refs: [
              "app.bsky.embed.images",
              "app.bsky.embed.video",
              "app.bsky.embed.external",
              "app.bsky.embed.record",
              "app.bsky.embed.recordWithMedia",
            ],
          },
          langs: {
            type: "array",
            description: "Indicates human language of post primary text content.",
            maxLength: 3,
            items: { type: "string", format: "language" },
          },
          labels: {
            type: "union",
            description: "Self-label values for this post. Effectively content warnings.",
            refs: ["com.atproto.label.defs#selfLabels"],
          },
          tags: {
            type: "array",
            description:
              "Additional hashtags, in addition to any included in post text and facets.",
            maxLength: 8,
            items: { type: "string", maxLength: 640, maxGraphemes: 64 },
          },
          createdAt: {
            type: "string",
            format: "datetime",
            description: "Client-declared timestamp when this post was originally created.",
          },
        },
      },
    },
    replyRef: {
      type: "object",
      description:
        "Reference to parent and root posts for replies. Must reference stratos posts only.",
      required: ["root", "parent"],
      properties: {
        root: { type: "ref", ref: "com.atproto.repo.strongRef" },
        parent: { type: "ref", ref: "com.atproto.repo.strongRef" },
      },
    },
  },
};

export const stratosLexicons: Record<string, LexiconDoc> = {
  "app.stratos.defs": stratosDefs,
  "app.stratos.boundary.defs": boundaryDefs,
  "app.stratos.actor.enrollment": actorEnrollment,
  "app.stratos.feed.post": feedPost,
};

export const isStratosNsid = (nsid: string): boolean => nsid in stratosLexicons;
