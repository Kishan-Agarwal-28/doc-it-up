import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Moon,
  Sun,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Zap,
  Shield,
  Code,
  Database,
  Globe,
  Server,
  Info,
  Code2,
  Lock,
  MessageCircle,
  Hash,
} from "lucide-react";

// Actual SwaggerUI component
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// --- Interfaces (No changes needed here) ---
interface EndpointInfo {
  path: string;
  method: string;
  endpoint: {
    summary: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{
      name: string;
      in: string;
      required?: boolean;
      description?: string;
      schema?: {
        type: string;
        format?: string;
        default?: any;
        minimum?: number;
        maximum?: number;
      };
      example?: any;
    }>;
    requestBody?: {
      required?: boolean;
      content: {
        [contentType: string]: {
          schema?: {
            $ref?: string;
            type?: string;
            properties?: any;
            required?: string[];
          };
          example?: any; // Added to interface for clarity
          examples?: {
            [exampleName: string]: {
              summary?: string;
              value: any;
            };
          };
        };
      };
    };
    responses: {
      [statusCode: string]: {
        description: string;
        content?: {
          [contentType: string]: {
            schema?: {
              $ref?: string;
              type?: string;
              properties?: any;
              required?: string[];
            };
            example?: any; // Added to interface for clarity
            examples?: {
              [exampleName: string]: {
                summary?: string;
                value: any;
              };
            };
          };
        };
      };
    };
    security?: Array<{ [key: string]: string[] }>;
  };
}

interface SchemaProperty {
  type: string;
  format?: string;
  description?: string;
  example?: any;
  enum?: string[];
  minLength?: number;
  default?: any;
}

interface Schema {
  type: string;
  properties?: { [key: string]: SchemaProperty };
  required?: string[];
  description?: string;
}

interface ApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags?: Array<{
    name: string;
    description: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: EndpointInfo["endpoint"];
    };
  };
  components?: {
    schemas?: { [key: string]: Schema };
    securitySchemes?: { [key: string]: any };
  };
  security?: Array<{ [key: string]: string[] }>;
}

const ApiDocumentation: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSwaggerUI, setShowSwaggerUI] = useState(false);
  const [apiSpec, setApiSpec] = useState<ApiSpec | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(
    null
  );
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- NEW: useEffect to fetch the API specification ---
  useEffect(() => {
    const fetchApiSpec = async () => {
      setLoading(true);
      setError(null);
      setSelectedEndpoint(null);

      try {
        const response = await fetch("/docs/swagger.json");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch API spec: ${response.status} ${response.statusText}`
          );
        }

        const specData: ApiSpec = await response.json();
        setApiSpec(specData);

        // Set the initial selected endpoint after data is fetched
        const groupedEndpoints = getEndpointsByTag(specData);
        const firstTag = Object.keys(groupedEndpoints)[0];
        if (firstTag) {
          const endpoints = groupedEndpoints[firstTag];
          if (endpoints && endpoints.length > 0) {
            setSelectedEndpoint(endpoints[0]);
            setExpandedSections({ [firstTag]: true });
          }
        }
      } catch (e: any) {
        console.error("Error fetching or parsing API spec:", e);
        setError(
          e.message ||
            "An unknown error occurred while fetching the documentation."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApiSpec();
  }, [refreshTrigger]); // Re-run this effect when refreshTrigger changes

  // Apply dark mode class to body
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);
useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);
  const toggleDarkMode = () =>{ 
    setDarkMode((prev) => !prev)
  };

  // --- UPDATED: refreshDocs now triggers the fetch effect ---
  const refreshDocs = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // --- Helper Functions (no changes needed) ---
  const getMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      get: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      post: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      put: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      patch:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return (
      colors[method.toLowerCase()] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getEndpointsByTag = (
    spec: ApiSpec | null
  ): { [tag: string]: EndpointInfo[] } => {
    if (!spec) return {};
    const tags: { [tag: string]: EndpointInfo[] } = {};
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        const tag = endpoint.tags?.[0] || "General";
        if (!tags[tag]) tags[tag] = [];
        tags[tag].push({ path, method, endpoint });
      });
    });
    return tags;
  };

  const categorizedEndpoints = React.useMemo(() => {
    const allEndpoints = getEndpointsByTag(apiSpec);
    if (searchTerm === "") return allEndpoints;

    const filtered: { [tag: string]: EndpointInfo[] } = {};
    Object.entries(allEndpoints).forEach(([tag, endpoints]) => {
      const filteredForTag = endpoints.filter(
        (item) =>
          item.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.endpoint.summary
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (item.endpoint.description &&
            item.endpoint.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
      if (filteredForTag.length > 0) {
        filtered[tag] = filteredForTag;
      }
    });
    return filtered;
  }, [apiSpec, searchTerm]);

  const stats = React.useMemo(() => {
    if (!apiSpec) return { endpoints: 0, methods: 0, auth: 0, tags: 0 };
    const totalEndpoints = Object.keys(apiSpec.paths).length;
    const totalMethods = Object.values(apiSpec.paths).reduce(
      (acc, methods) => acc + Object.keys(methods).length,
      0
    );
    const totalAuthSchemes = Object.keys(
      apiSpec.components?.securitySchemes || {}
    ).length;
    const uniqueTags = new Set(
      Object.values(apiSpec.paths).flatMap((methods) =>
        Object.values(methods).flatMap((endpoint) => endpoint.tags || [])
      )
    ).size;

    return {
      endpoints: totalEndpoints,
      methods: totalMethods,
      auth: totalAuthSchemes,
      tags: uniqueTags,
    };
  }, [apiSpec]);

  const renderSchemaProperties = (
    schemaRef: string,
    components?: ApiSpec["components"]
  ) => {
    if (!schemaRef || !components || !components.schemas) return null;
    const schemaName = schemaRef.replace("#/components/schemas/", "");
    const schema = components.schemas[schemaName];
    if (!schema || !schema.properties)
      return (
        <p className="text-muted-foreground">No schema properties found.</p>
      );
    return (
      <div className="mt-4 border rounded-md bg-muted/20 p-4">
        <h4 className="font-semibold mb-2 flex items-center">
          <Hash className="w-4 h-4 mr-2" />
          Schema:{" "}
          <span className="font-mono ml-1 text-primary">{schemaName}</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {Object.entries(schema.properties).map(([propName, propDetails]) => (
            <li key={propName}>
              <strong className="font-mono text-foreground">{propName}</strong>:{" "}
              <Badge variant="secondary" className="mr-1">
                {propDetails.type}
              </Badge>
              {propDetails.format && (
                <Badge variant="outline" className="mr-1 text-xs">
                  {propDetails.format}
                </Badge>
              )}
              {schema.required?.includes(propName) && (
                <Badge className="bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300 mr-1 text-xs">
                  Required
                </Badge>
              )}
              <span className="text-muted-foreground ml-2">
                {propDetails.description ||
                  (propDetails.example
                    ? `Example: ${propDetails.example}`
                    : "No description")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // --- NEW: Helper component to render content details (schema and examples) ---
  const ContentRenderer = ({
    contentDetails,
    components,
    backgroundClass = "bg-background",
  }: {
    contentDetails: any;
    components?: ApiSpec["components"];
    backgroundClass?: string;
  }) => {
    return (
      <>
        {/* Schema Rendering */}
        {contentDetails.schema?.$ref &&
          renderSchemaProperties(contentDetails.schema.$ref, components)}
        {contentDetails.schema &&
          !contentDetails.schema.$ref &&
          contentDetails.schema.properties && (
            <div className="mt-4 border rounded-md bg-muted/20 p-4">
              <h4 className="font-semibold mb-2 flex items-center">
                <Hash className="w-4 h-4 mr-2" />
                Schema
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {Object.entries(contentDetails.schema.properties).map(
                  ([propName, propDetails]: [string, any]) => (
                    <li key={propName}>
                      <strong className="font-mono text-foreground">
                        {propName}
                      </strong>
                      :{" "}
                      <Badge variant="secondary" className="mr-1">
                        {propDetails.type}
                      </Badge>
                      {propDetails.format && (
                        <Badge variant="outline" className="mr-1 text-xs">
                          {propDetails.format}
                        </Badge>
                      )}
                      {contentDetails.schema.required?.includes(propName) && (
                        <Badge className="bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300 mr-1 text-xs">
                          Required
                        </Badge>
                      )}
                      <span className="text-muted-foreground ml-2">
                        {propDetails.description ||
                          (propDetails.example
                            ? `Example: ${propDetails.example}`
                            : "")}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

        {/* Example Rendering */}
        {contentDetails.example && (
          <div className="mt-4">
            <h5 className="font-semibold mb-2">Example:</h5>
            <div className={`mb-3 p-3 border rounded-md ${backgroundClass}`}>
              <pre className="p-2 bg-muted rounded-md overflow-x-auto text-sm">
                <code>{JSON.stringify(contentDetails.example, null, 2)}</code>
              </pre>
            </div>
          </div>
        )}
        {contentDetails.examples && (
          <div className="mt-4">
            <h5 className="font-semibold mb-2">Examples:</h5>
            {Object.entries(contentDetails.examples).map(
              ([exampleName, exampleDetails]: [string, any]) => (
                <div
                  key={exampleName}
                  className={`mb-3 p-3 border rounded-md ${backgroundClass}`}
                >
                  <p className="font-medium">
                    {exampleDetails.summary || exampleName}
                  </p>
                  <pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto text-sm">
                    <code>{JSON.stringify(exampleDetails.value, null, 2)}</code>
                  </pre>
                </div>
              )
            )}
          </div>
        )}
      </>
    );
  };

  // --- Loading and Error State UI ---
  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
        <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">
              Loading API Documentation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
        <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
          <div className="text-center p-4">
            <Info className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-red-500">
              Error Loading Documentation
            </h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={refreshDocs} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="bg-background text-foreground min-h-screen">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      { "Auto-Generated API Documentation"}
                    </h1>
                    <p className="text-sm text-muted-foreground">Project Name: {apiSpec?.info?.title || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">{apiSpec?.info?.description || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">
                      Version: {apiSpec?.info?.version || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={showSwaggerUI ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowSwaggerUI(false)}
                >
                  <Code2 className="w-4 h-4 mr-2" /> Custom View
                </Button>
                <Button
                  variant={showSwaggerUI ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowSwaggerUI(true)}
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Swagger UI
                </Button>
                <Button variant="outline" size="sm" onClick={refreshDocs}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                  {darkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main>
          {showSwaggerUI ? (
            <div className="container mx-auto px-4 py-6 md:px-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Full Interactive Swagger UI</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="swagger-ui-container">
                    <SwaggerUI spec={apiSpec as object} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Stats Dashboard */}
              <div className="container mx-auto px-4 py-6 md:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Cards for stats... */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.endpoints}</p>
                        <p className="text-sm text-muted-foreground">
                          Total Endpoints
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.methods}</p>
                        <p className="text-sm text-muted-foreground">
                          HTTP Methods
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.auth}</p>
                        <p className="text-sm text-muted-foreground">
                          Auth Methods
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Database className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.tags}</p>
                        <p className="text-sm text-muted-foreground">
                          API Categories
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sidebar */}
                  <aside className="lg:col-span-1">
                    <Card className="shadow-lg sticky top-24">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Search className="w-5 h-5 text-primary" />
                          <span>Browse Endpoints</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search endpoints..."
                              className="w-full pl-10"
                              value={searchTerm}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => setSearchTerm(e.target.value)}
                            />
                          </div>

                          <ScrollArea className="h-[calc(100vh-420px)]">
                            <div className="space-y-1 pr-3">
                              {Object.keys(categorizedEndpoints).length ===
                              0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                  No endpoints found
                                  {searchTerm && ` for "${searchTerm}"`}.
                                </p>
                              ) : (
                                Object.entries(categorizedEndpoints).map(
                                  ([tag, endpoints]) => (
                                    <div key={tag} className="mb-2">
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-start p-2 h-auto text-base hover:bg-muted/50"
                                        onClick={() => toggleSection(tag)}
                                      >
                                        {expandedSections[tag] ? (
                                          <ChevronDown className="w-4 h-4 mr-2" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 mr-2" />
                                        )}
                                        <span className="font-semibold text-foreground truncate">
                                          {tag}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto"
                                        >
                                          {endpoints.length}
                                        </Badge>
                                      </Button>

                                      {expandedSections[tag] && (
                                        <div className="ml-6 space-y-1 mt-1 border-l">
                                          {endpoints.map(
                                            ({ path, method, endpoint }) => (
                                              <Button
                                                key={`${path}-${method}`}
                                                variant={
                                                  selectedEndpoint?.path ===
                                                    path &&
                                                  selectedEndpoint?.method ===
                                                    method
                                                    ? "secondary"
                                                    : "ghost"
                                                }
                                                className="w-full justify-start p-2 h-auto pl-4 text-sm hover:bg-muted/70"
                                                onClick={() =>
                                                  setSelectedEndpoint({
                                                    path,
                                                    method,
                                                    endpoint,
                                                  })
                                                }
                                              >
                                                <Badge
                                                  className={`mr-2 ${getMethodColor(
                                                    method
                                                  )}`}
                                                >
                                                  {method.toUpperCase()}
                                                </Badge>
                                                <span className="truncate flex-grow text-left">
                                                  {path}
                                                </span>
                                              </Button>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  </aside>

                  {/* Endpoint Detail View */}
                  <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Code className="w-5 h-5 text-primary" />
                          <span>Endpoint Details</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedEndpoint && apiSpec ? (
                          <div className="space-y-6">
                            <h2 className="text-2xl font-bold flex items-center flex-wrap">
                              <Badge
                                className={`text-lg px-3 py-1 mr-3 mb-2 ${getMethodColor(
                                  selectedEndpoint.method
                                )}`}
                              >
                                {selectedEndpoint.method.toUpperCase()}
                              </Badge>
                              <span className="break-all font-mono">
                                {selectedEndpoint.path}
                              </span>
                            </h2>
                            <p className="text-muted-foreground text-lg mb-4">
                              {selectedEndpoint.endpoint.summary}
                            </p>
                            {selectedEndpoint.endpoint.description && (
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center">
                                  <Info className="w-4 h-4 mr-2" />
                                  Description
                                </h3>
                                <p className="text-foreground leading-relaxed">
                                  {selectedEndpoint.endpoint.description}
                                </p>
                              </div>
                            )}

                            {/* Parameters */}
                            {selectedEndpoint.endpoint.parameters &&
                              selectedEndpoint.endpoint.parameters.length >
                                0 && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-lg flex items-center">
                                    <Hash className="w-4 h-4 mr-2" />
                                    Parameters
                                  </h3>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="py-2 pr-4 font-medium">
                                            Name
                                          </th>
                                          <th className="py-2 pr-4 font-medium">
                                            In
                                          </th>
                                          <th className="py-2 pr-4 font-medium">
                                            Type
                                          </th>
                                          <th className="py-2 pr-4 font-medium">
                                            Required
                                          </th>
                                          <th className="py-2 pr-4 font-medium">
                                            Description
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedEndpoint.endpoint.parameters.map(
                                          (param, index) => (
                                            <tr
                                              key={index}
                                              className="border-b last:border-b-0"
                                            >
                                              <td className="py-2 pr-4 font-mono">
                                                {param.name}
                                              </td>
                                              <td className="py-2 pr-4">
                                                <Badge variant="outline">
                                                  {param.in}
                                                </Badge>
                                              </td>
                                              <td className="py-2 pr-4">
                                                {param.schema?.type}{" "}
                                                {param.schema?.format &&
                                                  `(${param.schema.format})`}
                                              </td>
                                              <td className="py-2 pr-4">
                                                {param.required ? (
                                                  <span className="text-green-500">
                                                    Yes
                                                  </span>
                                                ) : (
                                                  "No"
                                                )}
                                              </td>
                                              <td className="py-2 pr-4 text-muted-foreground">
                                                {param.description || "N/A"}
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            {/* --- UPDATED: Request Body --- */}
                            {selectedEndpoint.endpoint.requestBody && (
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center">
                                  <Code className="w-4 h-4 mr-2" />
                                  Request Body
                                </h3>
                                {Object.entries(
                                  selectedEndpoint.endpoint.requestBody.content
                                ).map(([contentType, contentDetails]) => (
                                  <div key={contentType} className="mt-2">
                                    <h4 className="text-md font-medium flex items-center">
                                      <MessageCircle className="w-4 h-4 mr-2" />
                                      Content Type:{" "}
                                      <Badge
                                        variant="secondary"
                                        className="ml-1"
                                      >
                                        {contentType}
                                      </Badge>
                                    </h4>
                                    <ContentRenderer
                                      contentDetails={contentDetails}
                                      components={apiSpec.components}
                                      backgroundClass="bg-accent/20"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* --- UPDATED: Responses --- */}
                            {selectedEndpoint.endpoint.responses && (
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg flex items-center">
                                  <Zap className="w-4 h-4 mr-2" />
                                  Responses
                                </h3>
                                <Tabs
                                  defaultValue={
                                    Object.keys(
                                      selectedEndpoint.endpoint.responses
                                    )[0]
                                  }
                                  className="w-full"
                                >
                                  <ScrollArea className="w-full whitespace-nowrap pb-2">
                                    <TabsList className="w-full justify-start">
                                      {Object.entries(
                                        selectedEndpoint.endpoint.responses
                                      ).map(([statusCode, responseDetails]) => (
                                        <TabsTrigger
                                          key={statusCode}
                                          value={statusCode}
                                        >
                                          <Badge
                                            variant="outline"
                                            className={`mr-2 ${
                                              statusCode.startsWith("2")
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                : statusCode.startsWith("4")
                                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                                : statusCode.startsWith("5")
                                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                : ""
                                            }`}
                                          >
                                            {statusCode}
                                          </Badge>
                                          {responseDetails.description ||
                                            "Response"}
                                        </TabsTrigger>
                                      ))}
                                    </TabsList>
                                  </ScrollArea>
                                  {Object.entries(
                                    selectedEndpoint.endpoint.responses
                                  ).map(([statusCode, responseDetails]) => (
                                    <TabsContent
                                      key={statusCode}
                                      value={statusCode}
                                      className="mt-4 border p-4 rounded-lg bg-secondary/10"
                                    >
                                      <p className="font-medium mb-2">
                                        {responseDetails.description}
                                      </p>
                                      {responseDetails.content &&
                                        Object.entries(
                                          responseDetails.content
                                        ).map(
                                          ([contentType, contentDetails]) => (
                                            <div
                                              key={contentType}
                                              className="mt-2"
                                            >
                                              <h4 className="text-md font-medium flex items-center">
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                Content Type:{" "}
                                                <Badge
                                                  variant="secondary"
                                                  className="ml-1"
                                                >
                                                  {contentType}
                                                </Badge>
                                              </h4>
                                              <ContentRenderer
                                                contentDetails={contentDetails}
                                                components={apiSpec.components}
                                              />
                                            </div>
                                          )
                                        )}
                                      {!responseDetails.content && (
                                        <p className="text-muted-foreground text-sm">
                                          No content for this response.
                                        </p>
                                      )}
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              </div>
                            )}

                            {/* Security */}
                            {selectedEndpoint.endpoint.security &&
                              selectedEndpoint.endpoint.security.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-lg flex items-center">
                                    <Lock className="w-4 h-4 mr-2" />
                                    Security
                                  </h3>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {selectedEndpoint.endpoint.security.map(
                                      (sec, index) => (
                                        <li key={index}>
                                          {Object.keys(sec)
                                            .map((scheme) => (
                                              <span
                                                key={scheme}
                                                className="font-mono"
                                              >
                                                {scheme}
                                              </span>
                                            ))
                                            .join(", ")}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="p-12 text-center h-[calc(100vh-250px)] flex flex-col justify-center items-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                              <BookOpen className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">
                              Welcome to the API Documentation
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                              Select an endpoint from the left sidebar to view
                              its details, parameters, request body, and
                              responses.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="container mx-auto px-4 py-6 md:px-6 mt-8 border-t text-center text-muted-foreground hover:underline">
                <p>
                  <a
                    rel="referrer"
                    href="https://npmjs.com/package/doc-it-up"
                    target="_blank"
                    className="text-primary"
                  >
                    This API documentation is automatically generated by doc-it-up.
                  </a>
                </p>
                <div className="flex items-center space-x-2 w-full h-20 mx-auto">
                  <img
                    src="https://cdn.letshost.dpdns.org/image/upload/v1751581420/__cdn/685f0e4b7d1b59a6be2a63db/img/ldyoFzE4kF/101/kjfsymvet1lvkuuyrya5.png"
                    alt="doc-it-up logo"
                    className="w-20 h-full object-fill rounded-xl"
                  />
                  <span className="text-xl font-bold hover:underline">
                    <a
                      rel="referrer"
                      href="https://npmjs.com/package/doc-it-up"
                      target="_blank"
                      className="text-primary"
                    >
                      Made with doc-it-up
                    </a>
                  </span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ApiDocumentation;
