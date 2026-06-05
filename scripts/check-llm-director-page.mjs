import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "works/llm-director-hitman/index.html");
const homePath = path.join(root, "index.html");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function readRequired(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} missing at ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    fail(`${label} missing "${needle}"`);
  }
}

function assertNoAiContrastPattern(html, label) {
  const compact = html.replace(/\s+/g, "");
  if (/不是.{0,32}而是/.test(compact)) {
    fail(`${label} contains avoid-listed pattern "不是...而是"`);
  }
}

const page = readRequired(pagePath, "LLM Director Hitman page");
const home = readRequired(homePath, "homepage");

if (page) {
  [
    "LLM Director Hitman：可控 AI 玩法体验原型",
    "https://github.com/huoshangou/llm-director-hitman",
    "语义编排层",
    "确定性沙盒层",
    "演出表现层",
    "纺锤体体验线",
    "可信中间状态",
    "受阻后的下一步引导",
    "受阻原因、替代路径与下一步提示",
    "规则裁定器",
    "返回缺口供队友提示",
    "下一轮 replan",
    "LLM 选择并调用合法工具，固定规则结算世界",
    "Agentic tool-use 的第一阶段",
    "验证范围",
    "输入：自然语言计划 / 输出：DirectorPlan · toolChain",
    "输入：工具请求 / 输出：WorldState · GameEvent",
    "observe -> choose tool -> execute -> observe",
    "ToolRegistry、actor 权限",
    "同一命题的两个尺度",
  ].forEach((needle) => assertIncludes(page, needle, "LLM Director Hitman page"));
  assertNoAiContrastPattern(page, "LLM Director Hitman page");
  if (page.includes("降级追问")) {
    fail('LLM Director Hitman page should use reader-facing wording instead of "降级追问"');
  }
  if (page.includes("语义编译层")) {
    fail('LLM Director Hitman page should use "语义编排层" for Layer 01');
  }
  if (page.includes("按 precondition、effect、ripple 更新 WorldState")) {
    fail("LLM Director Hitman page should explain ToolResolver in reader-facing wording");
  }
  [
    "对外说明采用",
    "作品集用",
    "首次出现时",
    "Project mapping:",
    "本页面以当前本地项目状态",
    "作为写作基准",
  ].forEach((needle) => {
    if (page.includes(needle)) {
      fail(`LLM Director Hitman page contains author-facing note "${needle}"`);
    }
  });
}

if (home) {
  assertIncludes(home, "works/llm-director-hitman/index.html", "homepage");
  assertIncludes(home, "LLM Director Hitman", "homepage");

  const railStart = home.indexOf('<div class="portfolio-rail">');
  const railEnd = home.indexOf("</div>\n      </div>\n    </section>", railStart);
  const rail = railStart === -1 ? "" : home.slice(railStart, railEnd === -1 ? undefined : railEnd);

  if (!rail) {
    fail("homepage portfolio rail not found");
  }

  const levelIndex = rail.indexOf("works/level-design-deck/index.html");
  const hitmanIndex = rail.indexOf("works/llm-director-hitman/index.html");
  const yatzyIndex = rail.indexOf("works/yatzyforge/index.html");

  if (!(levelIndex !== -1 && hitmanIndex !== -1 && yatzyIndex !== -1)) {
    fail("homepage missing one of the required work-card links");
  } else if (!(levelIndex < hitmanIndex && hitmanIndex < yatzyIndex)) {
    fail("homepage work-card order should be level-design-deck -> LLM Director Hitman -> Yatzyforge");
  }
  assertNoAiContrastPattern(home, "homepage");
}

if (!process.exitCode) {
  console.log("LLM Director Hitman portfolio checks passed.");
}
