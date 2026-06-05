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
    "语义编译层",
    "确定性沙盒层",
    "演出表现层",
    "纺锤体体验线",
    "可信中间状态",
    "同一命题的两个尺度",
  ].forEach((needle) => assertIncludes(page, needle, "LLM Director Hitman page"));
  assertNoAiContrastPattern(page, "LLM Director Hitman page");
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
