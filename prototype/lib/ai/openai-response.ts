export type OpenAiResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export function extractOpenAiResponseText(response: OpenAiResponse) {
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")
    ?.text;
}
