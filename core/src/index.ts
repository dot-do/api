export { API } from './api'
export { resolveConfig, separateFunctionsFromConfig, discoverEnv, inferApiName, KNOWN_CONFIG_KEYS } from './config'
export type { ApiInput, ResolvedConfig } from './config'
export { McpToolRegistry, createMcpToolRegistry } from './mcp-registry'
export type { RegistryTool } from './mcp-registry'
export type {
  ApiConfig,
  ApiEnv,
  ApiMeta,
  AuthConfig,
  RateLimitConfig,
  CrudConfig,
  ProxyConfig,
  RpcConfig,
  McpConfig,
  McpTool,
  McpToolTest,
  McpToolExample,
  McpResource,
  AnalyticsConfig,
  RestEndpointTest,
  DatabaseConfig,
  SchemaDef,
  FieldDef,
  EventSinkConfig,
  ResponseEnvelope,
  RespondOptions,
  Links,
  Actions,
  Options,
  UserContext,
  UserInfo,
  ResponseMeta,
  ErrorDetail,
  ErrorContext,
  ErrorResponse,
  GeoInfo,
  Bindings,
  Variables,
} from './types'

export { responseMiddleware } from './response'
export { contextMiddleware, corsMiddleware, authMiddleware, authLevelMiddleware, requireAuth, buildUserContext, rateLimitMiddleware, billingMiddleware, requirePlan, requireFeature, getFeatureRequirements, createErrorHandler, metaMiddleware, mutationMiddleware, responseModesMiddleware, rewriteUrlToDomainStyle } from './middleware'
export type { AuthLevel, AuthLevelConfig, MutationConfig, BillingConfig, PlanConfig, PlanRate, PlanQuota, ResponseMode, ResponseModeConfig } from './middleware'
export { crudConvention, proxyConvention, rpcConvention, mcpConvention, analyticsMiddleware, analyticsRoutes, analyticsBufferRoutes, AnalyticsBufferDO, testingConvention, databaseConvention, DatabaseDO, functionsConvention, searchConvention, transportConvention, jobsConvention, JobManager, parquetConvention, generateSnippetManifest, eventsConvention } from './conventions'
export type { TransportConfig } from './conventions'
export type { SearchConfig, SearchProvider, FacetProvider, SearchResult, SearchOptions } from './conventions'
export { handlePageSize, handleSort, handleCount, handleSchema, handlePages, handleDistinct, handleFacets, handleHistory, handleEvents, stripMetaSegment } from './conventions'
export type { MetaResourceConfig } from './conventions'
export type { AnalyticsBufferConfig, BufferEvent, TestingConfig, TestCase, RestTestCase, Example } from './conventions'
export type { FunctionsConfig, FunctionDef, ProxyDef, MashupDef, LookupDef, PipelineDef } from './conventions'
export type { JobConfig, Job, JobStatus, JobProgress, FunctionExecutor } from './conventions'
export type { ParquetSourceConfig, ParquetFieldDef, ParquetFieldType, SnippetRule, SnippetManifest } from './conventions'
export type { EventsConfig, EventCategory, EventsBinding } from './conventions'
export { DEFAULT_EVENT_CATEGORIES } from './conventions'
export { parseSchema, parseField, parseModel, generateJsonSchema, buildTypeRegistry, createSqids, shuffleAlphabet, decodeSqid } from './conventions/database'
export type { ParsedSchema, ParsedModel, ParsedField, Document, DatabaseEvent, DatabaseDriverType, DatabaseDriver, DatabaseDriverFactory, QueryOptions, QueryResult, TypeRegistry, ReverseTypeRegistry, DecodedSqid } from './conventions/database'
export { buildPagination, buildPagePagination, buildCursorPagination } from './helpers/pagination'
export { createLinkBuilder } from './helpers/links'
export { notFound, badRequest, unauthorized, forbidden, rateLimited, internal, validationError, conflict, paymentRequired, buildErrorLinks, ApiError, ErrorCode, type ErrorCodeType } from './helpers/errors'
export type { ApiErrorOptions } from './helpers/errors'

// Router — self-describing ID URL routing
export { routerMiddleware, parseRoute } from './router'
export type { RouteInfo, ParsedRoute, CollectionRoute, EntityRoute, EntityActionRoute, CollectionActionRoute, MetaRoute, FunctionCallRoute, SearchRoute, UnknownRoute, RouterConfig } from './router'

// Helpers — ID parsing, function-call parsing, tenant resolution
export { parseEntityId, isEntityId } from './helpers/id-parser'
export type { ParsedEntityId } from './helpers/id-parser'
export { parseFunctionCall, isFunctionCall } from './helpers/function-parser'
export type { ParsedFunctionCall, ParsedArg, FunctionArgType } from './helpers/function-parser'
export { resolveTenant, extractTenantFromPath, extractTenantFromSubdomain } from './helpers/tenant'
export type { TenantResolution } from './helpers/tenant'

// Helpers — collection format (map/array) and options block
export { toMapFormat, toArrayFormat, formatCollection, isArrayMode } from './helpers/format'
export type { FormatOptions } from './helpers/format'
export { buildOptions } from './helpers/options'
export type { BuildOptionsConfig } from './helpers/options'

// Helpers — query filter parsing and canonicalization
export { parseFilters, canonicalizeFilter, parseSort, canonicalizeSort } from './helpers/filters'
export type { ParseFilterResult, ParseFilterOptions } from './helpers/filters'

// Helpers — GET mutation confirmation flow
export { generateConfirmHash, validateConfirmHash, buildConfirmUrl, buildConfirmPreview } from './helpers/confirm'
export type { ConfirmParams, ConfirmPreview, BuildConfirmPreviewOptions } from './helpers/confirm'

// Function-call URL convention
export { FunctionRegistry, functionCallConvention } from './conventions/function-calls'
export type { RegisteredFunction, FunctionCallInput, FunctionCallContext, FunctionCallConfig, FunctionListEntry, RegisterOptions } from './conventions/function-calls'
