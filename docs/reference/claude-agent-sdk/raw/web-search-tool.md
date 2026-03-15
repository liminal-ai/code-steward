---
source: https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/web-search-tool
scraped_at: 2026-03-14
title: Web Search Tool
---

# Web Search Tool

The web search tool gives Claude direct access to real-time web content, allowing it to answer questions with up-to-date information beyond its knowledge cutoff. Claude automatically cites sources from search results.

## Tool Versions

- **`web_search_20260209`**: Latest version. Supports **dynamic filtering** with Claude Opus 4.6 and Sonnet 4.6. Claude can write and execute code to filter search results before they reach the context window.
- **`web_search_20250305`**: Previous version. Available without dynamic filtering. Eligible for Zero Data Retention (ZDR).

The `web_search_20260209` version with dynamic filtering is **not** ZDR-eligible by default (relies on internal code execution). To use it with ZDR, disable dynamic filtering:

```json
{
  "type": "web_search_20260209",
  "name": "web_search",
  "allowed_callers": ["direct"]
}
```

## Supported Models

Web search is available on:
- Claude Opus 4.6, 4.5, 4.1, 4
- Claude Sonnet 4.6, 4.5, 4
- Claude Sonnet 3.7 (deprecated)
- Claude Haiku 4.5, 3.5 (deprecated)

## How Web Search Works

1. Claude decides when to search based on the prompt
2. The API executes the searches and provides Claude with the results (may repeat multiple times)
3. At the end of its turn, Claude provides a final response with cited sources

### Dynamic Filtering (Opus 4.6 and Sonnet 4.6)

With `web_search_20260209`, Claude can write and execute code to post-process query results, keeping only relevant information and discarding the rest. This leads to more accurate responses while reducing token consumption.

Particularly effective for:
- Searching through technical documentation
- Literature review and citation verification
- Technical research
- Response grounding and verification

Dynamic filtering requires the code execution tool to be enabled. Available on Claude API and Microsoft Azure. On Google Vertex AI, only the basic version (without dynamic filtering) is available.

## How to Use Web Search

Your organization's administrator must enable web search in the Claude Console.

```bash
curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "content-type: application/json" \
    --data '{
        "model": "claude-opus-4-6",
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": "What is the weather in NYC?"
            }
        ],
        "tools": [{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5
        }]
    }'
```

## Tool Definition

```json
{
  "type": "web_search_20250305",
  "name": "web_search",

  "max_uses": 5,

  "allowed_domains": ["example.com", "trusteddomain.org"],

  "blocked_domains": ["untrustedsource.com"],

  "user_location": {
    "type": "approximate",
    "city": "San Francisco",
    "region": "California",
    "country": "US",
    "timezone": "America/Los_Angeles"
  }
}
```

### Parameters

**`max_uses`**: Limits the number of searches performed. If Claude attempts more searches than allowed, the `web_search_tool_result` contains a `max_uses_exceeded` error code.

**Domain filtering:**
- Domains should not include the HTTP/HTTPS scheme (use `example.com` not `https://example.com`)
- Subdomains are automatically included (`example.com` covers `docs.example.com`)
- You can use either `allowed_domains` or `blocked_domains`, but not both in the same request
- Wildcard support: only one `*` per domain entry, after the domain part. Valid: `example.com/*`, `example.com/*/articles`. Invalid: `*.example.com`

**`user_location`**: Localizes search results. Fields: `type` (must be `"approximate"`), `city`, `region`, `country`, `timezone` (IANA timezone ID).

## Response Structure

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll search for when Claude Shannon was born."
    },
    {
      "type": "server_tool_use",
      "id": "srvtoolu_01WYG3ziw53XMcoyKL4XcZmE",
      "name": "web_search",
      "input": {
        "query": "claude shannon birth date"
      }
    },
    {
      "type": "web_search_tool_result",
      "tool_use_id": "srvtoolu_01WYG3ziw53XMcoyKL4XcZmE",
      "content": [
        {
          "type": "web_search_result",
          "url": "https://en.wikipedia.org/wiki/Claude_Shannon",
          "title": "Claude Shannon - Wikipedia",
          "encrypted_content": "EqgfCioIARgBIiQ...",
          "page_age": "April 30, 2025"
        }
      ]
    },
    {
      "text": "Claude Shannon was born on April 30, 1916, in Petoskey, Michigan",
      "type": "text",
      "citations": [
        {
          "type": "web_search_result_location",
          "url": "https://en.wikipedia.org/wiki/Claude_Shannon",
          "title": "Claude Shannon - Wikipedia",
          "encrypted_index": "Eo8BCioIAhgBIiQ...",
          "cited_text": "Claude Elwood Shannon (April 30, 1916 – February 24, 2001)..."
        }
      ]
    }
  ]
}
```

### Search Results

Each result includes:
- `url`: URL of the source page
- `title`: Title of the source page
- `page_age`: When the site was last updated
- `encrypted_content`: Must be passed back in multi-turn conversations for citations

### Citations

Always enabled. Each `web_search_result_location` includes:
- `url`, `title`: Source information
- `encrypted_index`: Reference that must be passed back for multi-turn conversations
- `cited_text`: Up to 150 characters of the cited content

Citation fields (`cited_text`, `title`, `url`) do not count towards input or output token usage.

**Display requirement:** When displaying API outputs directly to end users, citations must be included to the original source.

## Error Codes

| Error code | Description |
| --- | --- |
| `too_many_requests` | Rate limit exceeded |
| `invalid_input` | Invalid search query parameter |
| `max_uses_exceeded` | Maximum web search tool uses exceeded |
| `query_too_long` | Query exceeds maximum length |
| `unavailable` | An internal error occurred |

When an error occurs, the API still returns a 200 success response. The error is in the response body:

```json
{
  "type": "web_search_tool_result",
  "tool_use_id": "servertoolu_a93jad",
  "content": {
    "type": "web_search_tool_result_error",
    "error_code": "max_uses_exceeded"
  }
}
```

The response may include a `pause_turn` stop reason when the API pauses a long-running turn. Provide the response back as-is in a subsequent request to let Claude continue.

## Prompt Caching

Web search works with prompt caching. Add `cache_control` breakpoints to enable caching. The system automatically caches up to the last `web_search_tool_result` block.

For multi-turn conversations, set a `cache_control` breakpoint on or after the last `web_search_tool_result` block to reuse cached content:

```python
messages.append(
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "Should I expect rain later this week?",
                "cache_control": {"type": "ephemeral"},
            }
        ],
    }
)
```

## Batch Requests

You can include the web search tool in the Messages Batches API. Web search through batches is priced the same as in regular API requests.

## Usage and Pricing

```json
"usage": {
  "input_tokens": 105,
  "output_tokens": 6039,
  "server_tool_use": {
    "web_search_requests": 1
  }
}
```

Web search is available for **$10 per 1,000 searches**, plus standard token costs for search-generated content. Each web search counts as one use, regardless of the number of results returned. If an error occurs during web search, the web search will not be billed.
