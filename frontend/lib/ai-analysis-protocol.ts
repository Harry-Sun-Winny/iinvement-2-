export type AiModelId =
  | "gpt-5-nano"
  | "gpt-5-mini"
  | "gpt-5"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-5.4-nano"
  | "gpt-5.4-mini"
  | "gpt-5.4"
  | "gpt-5.4-pro"
  | "gpt-5.5"
  | "gpt-5.5-pro"
  | "gpt-5.6-luna"
  | "gpt-5.6-terra"
  | "gpt-5.6-sol"
  | "gpt-5.6-sol-pro"
  | "claude-haiku-3.5"
  | "claude-sonnet-4"
  | "claude-opus-4"
  | "claude-opus-4.1"
  | "claude-fable-5"
  | "claude-haiku-4.5"
  | "claude-sonnet-4.5"
  | "claude-sonnet-5"
  | "claude-opus-4.5"
  | "claude-opus-4.7"
  | "claude-opus-4.8"
  | "gemini-3.1-flash-lite"
  | "gemini-3.5-flash"
  | "gemini-3-pro"
  | "deepseek-r1"
  | "kimi-k3"
  | "grok-4"
  | "grok-4-fast"
  | "grok-4.5";

export type AiProvider = "openai" | "anthropic" | "google" | "deepseek" | "moonshot" | "xai";

export interface AiModelProfile {
  id: AiModelId;
  label: string;
  provider: AiProvider;
  role: string;
  strengths: string[];
  directive: string;
  tier: "small" | "balanced" | "frontier";
}

export const AI_PROMPT_VERSION = "asset-due-diligence-10.0-impact-probability-evidence-news";

const MODEL_CATALOG: AiModelProfile[] = [
  {
    id: "gpt-5-nano",
    label: "GPT-5 Nano · Quick Triage",
    provider: "openai",
    role: "low-cost data triage",
    strengths: ["classification", "missing-data scan", "fast checklist"],
    directive: "Chỉ sàng lọc và đánh dấu thiếu dữ liệu; không khóa quyết định đầu tư.",
    tier: "small",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 Mini · Screening Analyst",
    provider: "openai",
    role: "screening analyst",
    strengths: ["fast scorecard", "watchlist", "simple scenarios"],
    directive: "Sàng lọc nhanh, bắt buộc nêu cờ đỏ và chuyển hồ sơ phức tạp lên model mạnh hơn.",
    tier: "small",
  },
  {
    id: "gpt-5",
    label: "GPT-5 · General Reasoning",
    provider: "openai",
    role: "general reasoning analyst",
    strengths: ["structured reasoning", "financial math", "decision memo"],
    directive: "Lập luận có cấu trúc, kiểm tra giả định và không biến điểm số thành lời khuyên tuyệt đối.",
    tier: "balanced",
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1 · Risk Reviewer",
    provider: "openai",
    role: "risk reviewer",
    strengths: ["risk gates", "missing-data audit", "scenario analysis"],
    directive: "Đóng vai người phản biện rủi ro. Không bù trừ cờ đỏ bằng điểm tốt ở nhánh khác.",
    tier: "balanced",
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2 · Investment Lead",
    provider: "openai",
    role: "lead investment analyst",
    strengths: ["multi-branch synthesis", "counter-argument", "decision memo"],
    directive: "Ưu tiên lập luận có cấu trúc, kiểm tra chéo giả định và biến kết luận thành điều kiện hành động.",
    tier: "balanced",
  },
  {
    id: "gpt-5.4-nano",
    label: "GPT-5.4 Nano · Batch Triage",
    provider: "openai",
    role: "high-volume evidence classifier",
    strengths: ["batch classification", "field extraction", "missing-data scan"],
    directive: "Chỉ phân loại và trích xuất dữ liệu; không đưa khuyến nghị đầu tư hoặc kết luận định giá.",
    tier: "small",
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini · Evidence Screener",
    provider: "openai",
    role: "fast evidence screener",
    strengths: ["document extraction", "checklist", "scenario draft"],
    directive: "Sàng lọc hồ sơ và đánh dấu thiếu bằng chứng. Mọi kết luận phải ghi mức tin cậy.",
    tier: "small",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4 · Professional Analyst",
    provider: "openai",
    role: "professional diligence analyst",
    strengths: ["financial analysis", "document reasoning", "risk memo"],
    directive: "Đánh giá cấu trúc, phân tách dữ liệu với suy luận và kiểm tra chéo giả định.",
    tier: "balanced",
  },
  {
    id: "gpt-5.4-pro",
    label: "GPT-5.4 Pro · Long-context Reviewer",
    provider: "openai",
    role: "long-context diligence reviewer",
    strengths: ["long documents", "source comparison", "complex review"],
    directive: "Dùng cho hồ sơ nhiều tài liệu; phải dẫn lại mốc nguồn và nêu rõ phần không thể xác minh.",
    tier: "frontier",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5 · Advanced Research",
    provider: "openai",
    role: "advanced research analyst",
    strengths: ["long-context synthesis", "finance research", "tool planning"],
    directive: "Tổng hợp nghiên cứu dài, ghi mốc thời gian nguồn và tách dữ liệu trực tiếp khỏi proxy.",
    tier: "frontier",
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro · Investment Committee",
    provider: "openai",
    role: "investment committee reviewer",
    strengths: ["adversarial review", "deep research", "committee memo"],
    directive: "Không khóa quyết định khi thiếu bằng chứng quan trọng. Phải nêu phản biện mạnh nhất và điều kiện đảo chiều.",
    tier: "frontier",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna · Fast Frontier",
    provider: "openai",
    role: "fast frontier screener",
    strengths: ["low-cost frontier", "quick comparison", "high-volume triage"],
    directive: "Xử lý nhiều tài sản nhanh; luôn gắn nhãn đây là vòng sàng lọc trước thẩm định sâu.",
    tier: "frontier",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra · Balanced Frontier",
    provider: "openai",
    role: "balanced frontier analyst",
    strengths: ["cost-quality balance", "scenario scoring", "portfolio fit"],
    directive: "Cân bằng tốc độ và chiều sâu; phải lượng hóa độ nhạy theo regime và ngành.",
    tier: "frontier",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol · Flagship Investment Lead",
    provider: "openai",
    role: "flagship investment lead",
    strengths: ["frontier reasoning", "multi-agent synthesis", "financial model audit"],
    directive: "Thực hiện thẩm định sâu nhất: kiểm tra chéo giả định, kịch bản, định giá, rủi ro tail và điều kiện đảo chiều.",
    tier: "frontier",
  },
  {
    id: "gpt-5.6-sol-pro",
    label: "GPT-5.6 Sol Pro · Highest Effort",
    provider: "openai",
    role: "highest-effort investment committee",
    strengths: ["subagent synthesis", "deep research", "investment committee memo"],
    directive: "Dùng effort cao nhất và kiểm tra đa tác nhân; chỉ kết luận khi dữ liệu, phản chứng và cổng rủi ro đã được đối chiếu.",
    tier: "frontier",
  },
  {
    id: "claude-haiku-3.5",
    label: "Claude Haiku 3.5 · Fast Screen",
    provider: "anthropic",
    role: "screening analyst",
    strengths: ["fast triage", "concise scorecard", "watchlist"],
    directive: "Sàng lọc nhanh nhưng không bỏ qua cờ đỏ pháp lý, thanh khoản, đòn bẩy và dữ liệu thiếu.",
    tier: "balanced",
  },
  {
    id: "claude-sonnet-4",
    label: "Claude Sonnet 4 · Thesis Builder",
    provider: "anthropic",
    role: "thesis and evidence analyst",
    strengths: ["qualitative evidence", "long-form reasoning", "source discipline"],
    directive: "Tách sự kiện, diễn giải và suy luận. Nêu rõ bằng chứng nào còn cần kiểm chứng độc lập.",
    tier: "frontier",
  },
  {
    id: "claude-opus-4",
    label: "Claude Opus 4 · Finance Review",
    provider: "anthropic",
    role: "finance-first frontier analyst",
    strengths: ["long-horizon reasoning", "finance analysis", "complex workflows"],
    directive: "Ưu tiên chất lượng luận điểm tài chính, kiểm tra độ nhạy và giữ rõ ranh giới giữa dữ kiện và suy luận.",
    tier: "frontier",
  },
  {
    id: "claude-opus-4.1",
    label: "Claude Opus 4.1 · Specialist Review",
    provider: "anthropic",
    role: "specialist frontier reviewer",
    strengths: ["deep specialist reasoning", "adversarial review", "long context"],
    directive: "Dùng cho hồ sơ khó; phải nêu rõ giới hạn an toàn, nguồn dữ liệu và phần chưa thể xác minh.",
    tier: "frontier",
  },
  {
    id: "claude-fable-5",
    label: "Claude Fable 5 · Finance Frontier",
    provider: "anthropic",
    role: "finance-first frontier analyst",
    strengths: ["long-horizon reasoning", "finance analysis", "complex workflows"],
    directive: "Ưu tiên chất lượng luận điểm tài chính, kiểm tra độ nhạy và giữ ranh giới rõ ràng giữa dữ liệu và suy luận.",
    tier: "frontier",
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5 · Rapid Evidence Scan",
    provider: "anthropic",
    role: "rapid document screener",
    strengths: ["fast extraction", "checklist completion", "document triage"],
    directive: "Chỉ trích xuất và sàng lọc bằng chứng, luôn gắn nhãn dữ liệu thiếu hoặc cần xác minh.",
    tier: "small",
  },
  {
    id: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5 · Analyst Draft",
    provider: "anthropic",
    role: "structured analyst",
    strengths: ["structured memo", "source synthesis", "counter-argument"],
    directive: "Viết memo có cấu trúc, phân tách fact, inference và dữ liệu chưa được xác minh.",
    tier: "balanced",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5 · Research Lead",
    provider: "anthropic",
    role: "research lead",
    strengths: ["long-context analysis", "cross-document reasoning", "investment memo"],
    directive: "Tổng hợp đa tài liệu, nêu rõ nguồn và điểm bất đồng trước khi đưa ra điều kiện hành động.",
    tier: "frontier",
  },
  {
    id: "claude-opus-4.5",
    label: "Claude Opus 4.5 · Thesis Review",
    provider: "anthropic",
    role: "thesis reviewer",
    strengths: ["deep reasoning", "bear case", "source discipline"],
    directive: "Kiểm tra độ bền luận điểm và chỉ ra dữ liệu có thể làm kết luận đảo chiều.",
    tier: "frontier",
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7 · Diligence Committee",
    provider: "anthropic",
    role: "diligence committee reviewer",
    strengths: ["adversarial review", "scenario analysis", "complex evidence"],
    directive: "Đóng vai ủy ban phản biện, không cho phép điểm cao bù trừ cờ đỏ mất vốn vĩnh viễn.",
    tier: "frontier",
  },
  {
    id: "claude-opus-4.8",
    label: "Claude Opus 4.8 · Investment Committee",
    provider: "anthropic",
    role: "investment committee lead",
    strengths: ["high-stakes synthesis", "long-horizon risk", "decision gates"],
    directive: "Chỉ kết luận có điều kiện khi bằng chứng, phản biện, kịch bản và cổng rủi ro đều được đối chiếu.",
    tier: "frontier",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite · High Volume",
    provider: "google",
    role: "high-volume screener",
    strengths: ["speed", "cost efficiency", "batch comparison"],
    directive: "Sàng lọc hàng loạt, không dùng kết quả riêng lẻ để khóa giải ngân.",
    tier: "small",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash · Agentic Research",
    provider: "google",
    role: "agentic research analyst",
    strengths: ["tool use", "large context", "research synthesis"],
    directive: "Tổng hợp nguồn và dữ liệu dài, ghi rõ mốc thời gian của từng bằng chứng.",
    tier: "balanced",
  },
  {
    id: "gemini-3-pro",
    label: "Gemini 3 Pro · Research Synthesizer",
    provider: "google",
    role: "research synthesizer",
    strengths: ["source comparison", "macro context", "industry context"],
    directive: "Đặt tài sản trong bối cảnh vĩ mô và ngành. So sánh nguồn, mốc thời gian và mức độ đáng tin.",
    tier: "frontier",
  },
  {
    id: "grok-4",
    label: "Grok 4 · Market Narrative Check",
    provider: "xai",
    role: "market narrative reviewer",
    strengths: ["contrarian framing", "market narrative", "event-risk scan"],
    directive: "Tìm khoảng cách giữa câu chuyện thị trường và dữ liệu, nêu rõ nguồn nào chỉ là tin tức chưa kiểm chứng.",
    tier: "balanced",
  },
  {
    id: "grok-4-fast",
    label: "Grok 4 Fast · Event Triage",
    provider: "xai",
    role: "fast event-risk screener",
    strengths: ["fast triage", "event scan", "watchlist"],
    directive: "Sàng lọc nhanh sự kiện, không được dùng tin đơn lẻ để khóa quyết định đầu tư.",
    tier: "small",
  },
  {
    id: "grok-4.5",
    label: "Grok 4.5 · Cross-Market Challenger",
    provider: "xai",
    role: "cross-market adversarial reviewer",
    strengths: ["cross-market context", "adversarial review", "scenario challenge"],
    directive: "Đóng vai phản biện thị trường chéo, chỉ ra giả định dễ vỡ và điều kiện buộc phải đổi quyết định.",
    tier: "frontier",
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1 · Adversarial Checker",
    provider: "deepseek",
    role: "adversarial checker",
    strengths: ["bear case", "logic audit", "model disagreement"],
    directive: "Tìm lỗ hổng trong luận điểm, kiểm tra lỗi nhân quả và đưa ra trường hợp khiến quyết định phải đảo chiều.",
    tier: "balanced",
  },
  {
    id: "kimi-k3",
    label: "Kimi K3 · Prompt Export",
    provider: "moonshot",
    role: "long-context investment diligence reviewer",
    strengths: ["long-context dossiers", "evidence synthesis", "structured counter-thesis"],
    directive: "Tổng hợp theo hồ sơ đã cung cấp; tách fact, inference và assumption. Không bịa dữ liệu; cờ veto không được bù bằng điểm cao.",
    tier: "frontier",
  },
];

const DISABLED_PROMPT_MODELS = new Set<AiModelId>([
  "gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-5.1", "gpt-5.2", "gemini-3.1-flash-lite",
]);

export const AI_ANALYSIS_MODELS = MODEL_CATALOG.filter((model) => !DISABLED_PROMPT_MODELS.has(model.id));

export function getAiModelProfile(modelId: AiModelId) {
  return AI_ANALYSIS_MODELS.find((model) => model.id === modelId) ?? AI_ANALYSIS_MODELS[0];
}

export function buildPromptContract(modelId: AiModelId) {
  const model = getAiModelProfile(modelId);
  return `PROMPT_VERSION=${AI_PROMPT_VERSION}\nMODEL_LOCK=${model.id}\nMODEL_ROLE=${model.role}\nMODEL_DIRECTIVE=${model.directive}`;
}

export function buildModelComparisonContract(modelIds: AiModelId[]) {
  const uniqueIds = [...new Set(modelIds)];
  return `So sánh các lượt chỉ khi cùng tài sản, cùng kỳ đánh giá và cùng schema ${AI_PROMPT_VERSION}.\nCác model được phép trong phiên: ${uniqueIds.join(", ")}.\nKhông lấy điểm trung bình làm chân lý; phải nêu bất đồng giữa model và nguyên nhân thiếu dữ liệu.`;
}

export function isKnownAiModel(value: unknown): value is AiModelId {
  return typeof value === "string" && AI_ANALYSIS_MODELS.some((model) => model.id === value);
}
