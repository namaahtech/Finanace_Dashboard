import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { action, content, customPrompt, context } = await req.json();

    let prompt = "";

    switch (action) {
      case "summarize":    prompt = `Summarize the following text concisely, keeping all key points:\n\n${content}`; break;
      case "improve":      prompt = `Improve the grammar, flow, and professional tone of this text:\n\n${content}`; break;
      case "rewrite":      prompt = `Rewrite this text in a fresh, engaging way while keeping the same meaning:\n\n${content}`; break;
      case "brainstorm":   prompt = `Based on the following content, brainstorm 5 creative next steps or ideas:\n\n${content}`; break;
      case "shorten":      prompt = `Make this text significantly shorter and more concise:\n\n${content}`; break;
      case "expand":       prompt = `Expand and elaborate on this text with more detail and examples:\n\n${content}`; break;
      case "formal":       prompt = `Rewrite this in a formal, professional tone:\n\n${content}`; break;
      case "casual":       prompt = `Rewrite this in a casual, friendly tone:\n\n${content}`; break;
      case "plagiarism":   prompt = `Analyze this text for originality and suggest how to make generic parts more original:\n\n${content}`; break;
      case "formula_explain": prompt = `Explain what this spreadsheet formula does in simple English, breaking down each part:\n\n${content}`; break;
      case "formula_suggest": prompt = `I have this spreadsheet data:\n${context || ""}\n\nSuggest the best formula for: ${content}\n\nProvide the exact formula and a brief explanation.`; break;
      case "analyze_data": prompt = `Analyze this spreadsheet data and provide key insights, anomalies, and actionable recommendations:\n\n${content}`; break;
      case "predict_values": prompt = `Based on this data series, predict the next 5 values and explain the pattern:\n\n${content}`; break;
      case "clean_data":   prompt = `Review this data and suggest what needs cleaning, standardizing, or filling:\n\n${content}`; break;
      case "natural_query": prompt = `Answer this question about the spreadsheet data:\nQuestion: ${customPrompt}\n\nData:\n${content}`; break;
      case "generate_data": prompt = `Generate 10 rows of realistic sample data for: ${content}\n\nFormat as a table with headers.`; break;
      case "chart_suggest": prompt = `Based on this data, suggest the best chart type and explain why:\n\n${content}`; break;
      case "custom":       prompt = customPrompt ? `${customPrompt}\n\nContext:\n${content}` : content; break;
      default:             prompt = customPrompt || content;
    }

    const result = await callAI(prompt);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Workspace AI error:", error.message);
    return NextResponse.json({ error: error.message || "AI engine unavailable" }, { status: 500 });
  }
}
