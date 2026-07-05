import { describe, it, expect, beforeEach } from "vitest";
import {
  tsTypeToJsonSchema,
  extractFunctionInfo,
  createToolSchema,
  createToolMap,
  autoTools,
  ToolRegistry,
  globalToolRegistry,
  validateToolCalls,
  runTool,
  runToolCalls,
  flattenToolMessages,
} from "./tools";
import { Tool, ToolCall, Message } from "./types";

describe("tsTypeToJsonSchema", () => {
  it("should map primitive types correctly", () => {
    expect(tsTypeToJsonSchema("string")).toEqual({ type: "string" });
    expect(tsTypeToJsonSchema("number")).toEqual({ type: "number" });
    expect(tsTypeToJsonSchema("boolean")).toEqual({ type: "boolean" });
    expect(tsTypeToJsonSchema("integer")).toEqual({ type: "integer" });
  });

  it("should handle array types", () => {
    expect(tsTypeToJsonSchema("string[]")).toEqual({
      type: "array",
      items: { type: "string" },
    });
    expect(tsTypeToJsonSchema("number[]")).toEqual({
      type: "array",
      items: { type: "number" },
    });
  });

  it("should unwrap Promise types", () => {
    expect(tsTypeToJsonSchema("Promise<string>")).toEqual({ type: "string" });
    expect(tsTypeToJsonSchema("Promise<number>")).toEqual({ type: "number" });
  });

  it("should handle union types with null/undefined", () => {
    expect(tsTypeToJsonSchema("string | null")).toEqual({ type: "string" });
    expect(tsTypeToJsonSchema("string | undefined")).toEqual({ type: "string" });
  });

  it("should default to string for unknown types", () => {
    expect(tsTypeToJsonSchema("unknown")).toEqual({ type: "string" });
    expect(tsTypeToJsonSchema(undefined)).toEqual({ type: "string" });
  });
});

describe("extractFunctionInfo", () => {
  it("should extract function info with default values", () => {
    const testFunc = function myFunction() {
      return "test";
    };
    const result = extractFunctionInfo(testFunc);

    expect(result.type).toBe("function");
    expect(result.function?.name).toBe("myFunction");
    expect(result.function?.description).toBe("Call the myFunction function");
    expect(result.function?.parameters).toEqual({
      type: "object",
      properties: {},
      required: [],
    });
  });

  it("should use provided options", () => {
    const testFunc = () => "test";
    const result = extractFunctionInfo(testFunc, {
      name: "customName",
      description: "Custom description",
      parameters: {
        location: { type: "string", description: "The location", required: true },
        units: { type: "string", description: "Units", required: false },
      },
    });

    expect(result.function?.name).toBe("customName");
    expect(result.function?.description).toBe("Custom description");
    expect(result.function?.parameters.properties).toHaveProperty("location");
    expect(result.function?.parameters.properties).toHaveProperty("units");
    expect(result.function?.parameters.required).toContain("location");
    expect(result.function?.parameters.required).not.toContain("units");
  });
});

describe("createToolSchema", () => {
  it("should create tool schema from functions", () => {
    const getWeather = (location: string) => `Weather at ${location}`;
    const calcSum = (a: number, b: number) => a + b;

    const schema = createToolSchema([
      {
        func: getWeather,
        options: {
          name: "get_weather",
          description: "Get weather",
          parameters: {
            location: { type: "string", required: true },
          },
        },
      },
      {
        func: calcSum,
        options: {
          name: "calc_sum",
          description: "Calculate sum",
          parameters: {
            a: { type: "number", required: true },
            b: { type: "number", required: true },
          },
        },
      },
    ]);

    expect(schema).toHaveLength(2);
    expect(schema[0].function?.name).toBe("get_weather");
    expect(schema[1].function?.name).toBe("calc_sum");
  });
});

describe("createToolMap", () => {
  it("should create a map of function names to functions", () => {
    const getWeather = () => "sunny";
    const calcSum = () => 42;

    const map = createToolMap([
      { name: "get_weather", func: getWeather },
      { name: "calc_sum", func: calcSum },
    ]);

    expect(map.get("get_weather")).toBe(getWeather);
    expect(map.get("calc_sum")).toBe(calcSum);
  });
});

describe("autoTools", () => {
  it("should create both schema and map automatically", () => {
    const getWeather = () => "sunny";

    const [schema, map] = autoTools([
      {
        func: getWeather,
        options: {
          name: "get_weather",
          description: "Get weather",
        },
      },
    ]);

    expect(schema).toHaveLength(1);
    expect(schema[0].function?.name).toBe("get_weather");
    expect(map.get("get_weather")).toBe(getWeather);
  });
});

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it("should register and get handlers", () => {
    const handler = () => "result";
    registry.register("test_tool", handler);

    expect(registry.get("test_tool")).toBe(handler);
  });

  it("should unregister handlers", () => {
    const handler = () => "result";
    registry.register("test_tool", handler);
    expect(registry.has("test_tool")).toBe(true);

    registry.unregister("test_tool");
    expect(registry.has("test_tool")).toBe(false);
  });

  it("should list all registered handlers", () => {
    registry.register("tool1", () => {});
    registry.register("tool2", () => {});

    const list = registry.list();
    expect(list).toContain("tool1");
    expect(list).toContain("tool2");
  });

  it("should clear all handlers", () => {
    registry.register("tool1", () => {});
    registry.register("tool2", () => {});

    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });
});

describe("validateToolCalls", () => {
  const availableTools: Tool[] = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string", description: "Location" },
            units: { type: "string", description: "Units" },
          },
          required: ["location"],
        },
      },
    },
  ];

  it("should validate valid tool calls", () => {
    const toolCalls: ToolCall[] = [
      {
        id: "1",
        name: "get_weather",
        arguments: { location: "NYC" },
      },
    ];

    const result = validateToolCalls(toolCalls, availableTools);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect missing required parameters", () => {
    const toolCalls: ToolCall[] = [
      {
        id: "1",
        name: "get_weather",
        arguments: { units: "celsius" },
      },
    ];

    const result = validateToolCalls(toolCalls, availableTools);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Tool 'get_weather': missing required parameter 'location'"
    );
  });

  it("should detect unknown parameters", () => {
    const toolCalls: ToolCall[] = [
      {
        id: "1",
        name: "get_weather",
        arguments: { location: "NYC", unknown_param: "value" },
      },
    ];

    const result = validateToolCalls(toolCalls, availableTools);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Tool 'get_weather': unknown parameter 'unknown_param'"
    );
  });

  it("should detect unknown tools", () => {
    const toolCalls: ToolCall[] = [
      {
        id: "1",
        name: "unknown_tool",
        arguments: {},
      },
    ];

    const result = validateToolCalls(toolCalls, availableTools);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Tool 'unknown_tool' not found in available tools"
    );
  });
});

describe("runTool", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it("should execute a registered tool", async () => {
    registry.register("add", (args) => {
      const { a, b } = args as { a: number; b: number };
      return a + b;
    });

    const toolCall: ToolCall = {
      id: "1",
      name: "add",
      arguments: { a: 2, b: 3 },
    };

    const result = await runTool(toolCall, registry);
    expect(result.toolCallId).toBe("1");
    expect(result.result).toBe(5);
    expect(result.error).toBeUndefined();
  });

  it("should return error for unregistered tool", async () => {
    const toolCall: ToolCall = {
      id: "1",
      name: "unknown",
      arguments: {},
    };

    const result = await runTool(toolCall, registry);
    expect(result.result).toBeNull();
    expect(result.error).toBe("Tool 'unknown' is not registered");
  });

  it("should catch handler errors", async () => {
    registry.register("fail", () => {
      throw new Error("Something went wrong");
    });

    const toolCall: ToolCall = {
      id: "1",
      name: "fail",
      arguments: {},
    };

    const result = await runTool(toolCall, registry);
    expect(result.result).toBeNull();
    expect(result.error).toBe("Something went wrong");
  });

  it("should support async handlers", async () => {
    registry.register("async_add", async (args) => {
      const { a, b } = args as { a: number; b: number };
      return Promise.resolve(a + b);
    });

    const toolCall: ToolCall = {
      id: "1",
      name: "async_add",
      arguments: { a: 1, b: 2 },
    };

    const result = await runTool(toolCall, registry);
    expect(result.result).toBe(3);
  });
});

describe("runToolCalls", () => {
  it("should execute multiple tools in parallel", async () => {
    const registry = new ToolRegistry();
    registry.register("add", (args) => {
      const { a, b } = args as { a: number; b: number };
      return a + b;
    });
    registry.register("multiply", (args) => {
      const { a, b } = args as { a: number; b: number };
      return a * b;
    });

    const toolCalls: ToolCall[] = [
      { id: "1", name: "add", arguments: { a: 2, b: 3 } },
      { id: "2", name: "multiply", arguments: { a: 4, b: 5 } },
    ];

    const results = await runToolCalls(toolCalls, registry);
    expect(results).toHaveLength(2);
    expect(results[0].result).toBe(5);
    expect(results[1].result).toBe(20);
  });
});

describe("flattenToolMessages", () => {
  it("should flatten tool call messages", () => {
    const messages: Message[] = [
      {
        role: "assistant",
        tool_calls: [
          { id: "1", name: "get_weather", arguments: { location: "NYC" } },
        ],
      },
    ];

    const result = flattenToolMessages(messages);
    expect(result[0].role).toBe("assistant");
    expect(result[0].content).toBe(
      'Called get_weather with: {"location":"NYC"}'
    );
  });

  it("should flatten tool result messages", () => {
    const messages: Message[] = [
      {
        role: "tool",
        name: "get_weather",
        content: "Sunny, 75F",
      },
    ];

    const result = flattenToolMessages(messages);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("Result of get_weather: Sunny, 75F");
  });

  it("should pass through regular messages", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];

    const result = flattenToolMessages(messages);
    expect(result).toEqual(messages);
  });
});
