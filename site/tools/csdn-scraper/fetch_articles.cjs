#!/usr/bin/env node
/**
 * CSDN 专栏文章批量爬取工具
 *
 * 用法：
 *   node fetch_articles.cjs <article_list.json> <output_dir> <column_name> [already_done]
 *
 * 参数：
 *   article_list.json  - 文章列表 JSON 文件，格式：[{"title": "...", "url": "..."}, ...]
 *   output_dir          - 输出目录（相对于脚本所在目录或绝对路径）
 *   column_name         - 专栏名称（用于 frontmatter 中的标注）
 *   already_done        - (可选) 已完成的文章数，跳过前 N 篇，默认 0
 *
 * 示例：
 *   node fetch_articles.cjs ../../scratch/column_cpp_articles.json ../../blog/cpp "cpp" 0
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== 参数解析 ====================

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('用法: node fetch_articles.cjs <article_list.json> <output_dir> <column_name> [already_done]');
    console.error('示例: node fetch_articles.cjs list.json ../blog/my-column "专栏名" 0');
    process.exit(1);
}

// 路径相对于脚本所在目录的上级（即 repo 根目录）解析
const REPO_ROOT   = path.resolve(__dirname, '..', '..', '..');
const LIST_FILE   = path.resolve(REPO_ROOT, args[0]);
const TARGET_DIR  = path.resolve(REPO_ROOT, args[1]);
const COLUMN_NAME = args[2];
const ALREADY_DONE = parseInt(args[3]) || 0;
const DELAY_MS    = 2500;  // 请求间隔，避免反爬

// ==================== 加载文章列表 ====================

if (!fs.existsSync(LIST_FILE)) {
    console.error(`错误: 文章列表文件不存在: ${LIST_FILE}`);
    process.exit(1);
}

const articles = JSON.parse(fs.readFileSync(LIST_FILE, 'utf-8'));
console.log(`文章列表: ${LIST_FILE}`);
console.log(`文章总数: ${articles.length}`);
console.log(`已跳过:   ${ALREADY_DONE}`);
console.log(`待爬取:   ${articles.length - ALREADY_DONE}`);
console.log(`输出目录: ${TARGET_DIR}`);
console.log(`专栏名称: ${COLUMN_NAME}`);
console.log('---');

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// ==================== 工具函数 ====================

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://blog.csdn.net/',
            }
        };
        client.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function extractArticle(html) {
    // CSDN 文章内容在 <div id="content_views"> 中
    const startMarker = 'id="content_views"';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) return null;

    // 找到 <div 起始位置
    let divStart = html.lastIndexOf('<div', startIdx);
    if (divStart === -1) divStart = startIdx - 100;

    // 找到开标签结束位置
    let tagEnd = html.indexOf('>', startIdx);
    if (tagEnd === -1) return null;

    // 通过嵌套计数找到匹配的 </div>
    let depth = 1;
    let pos = tagEnd + 1;
    let foundEnd = -1;

    while (pos < html.length && depth > 0) {
        const nextOpen = html.indexOf('<div', pos);
        const nextClose = html.indexOf('</div>', pos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
            const nextChar = html[nextOpen + 4];
            if (nextChar === ' ' || nextChar === '>') {
                depth++;
            }
            pos = nextOpen + 4;
        } else {
            depth--;
            if (depth === 0) foundEnd = nextClose;
            pos = nextClose + 6;
        }
    }

    if (foundEnd === -1) return null;

    const contentHtml = html.substring(tagEnd + 1, foundEnd);

    // 提取标题
    const titleMatch = html.match(/<title>(.*?)(?:\s*-\s*CSDN博客)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    return { title, content: htmlToMarkdown(contentHtml) };
}

function htmlToMarkdown(html) {
    let md = html;

    // 移除无用标签
    md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
    md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
    md = md.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    md = md.replace(/<link[^>]*>/gi, '');
    md = md.replace(/<!--[\s\S]*?-->/g, '');

    // 代码块（必须在通用标签剥离前处理）
    md = md.replace(/<pre[^>]*><code[^>]*>/gi, '\n```\n');
    md = md.replace(/<\/code><\/pre>/gi, '\n```\n');

    // 行内代码
    md = md.replace(/<code[^>]*>/gi, '`');
    md = md.replace(/<\/code>/gi, '`');

    // 标题
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n');

    // 加粗和斜体
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');

    // 段落
    md = md.replace(/<p[^>]*>/gi, '\n\n');
    md = md.replace(/<\/p>/gi, '\n\n');

    // 换行
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // 列表
    md = md.replace(/<li[^>]*>/gi, '\n- ');
    md = md.replace(/<\/li>/gi, '');
    md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');

    // 表格
    md = md.replace(/<table[^>]*>/gi, '\n\n');
    md = md.replace(/<\/table>/gi, '\n\n');
    md = md.replace(/<\/?thead[^>]*>/gi, '');
    md = md.replace(/<\/?tbody[^>]*>/gi, '');
    md = md.replace(/<tr[^>]*>/gi, '| ');
    md = md.replace(/<\/tr>/gi, ' |\n');
    md = md.replace(/<t[dh][^>]*>/gi, '| ');
    md = md.replace(/<\/t[dh]>/gi, ' ');

    // 引用和分割线
    md = md.replace(/<blockquote[^>]*>/gi, '\n\n> ');
    md = md.replace(/<\/blockquote>/gi, '\n\n');
    md = md.replace(/<hr[^>]*>/gi, '\n\n---\n\n');

    // 链接和图片
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

    // 剥离剩余 HTML 标签
    md = md.replace(/<[^>]+>/g, '');

    // HTML 实体解码
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&#x27;/g, "'");
    md = md.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    md = md.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));

    // 清理多余空行
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.replace(/[ \t]+$/gm, '');
    return md.trim();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(title, index) {
    const num = String(index + 1).padStart(2, '0');
    let safe = title
        .replace(/[\/\\:*?"<>|]/g, '')
        .replace(/[\[\]]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);
    return `${num}-${safe}.md`;
}

// ==================== 主流程 ====================

async function main() {
    let success = 0, fail = 0;
    const errors = [];

    for (let i = ALREADY_DONE; i < articles.length; i++) {
        const article = articles[i];

        console.log(`[${i + 1}/${articles.length}] ${article.title}`);

        try {
            const html = await fetchUrl(article.url);
            const result = extractArticle(html);

            if (result && result.content.length > 50) {
                // 使用页面提取的真实标题生成文件名
                const realTitle = result.title || article.title;
                const filename = sanitizeFilename(realTitle, i);
                const filepath = path.join(TARGET_DIR, filename);

                const desc = result.content.substring(0, 150)
                    .replace(/\n/g, ' ')
                    .replace(/"/g, '\\"')
                    .trim();

                const frontmatter = `---
title: ${result.title}
description: ${desc}
---

# ${result.title}

> **原创** | 专栏「${COLUMN_NAME}」| [原文链接](${article.url})

${result.content}`;

                fs.writeFileSync(filepath, frontmatter, 'utf-8');
                console.log(`  ✓ ${filename} (${result.content.length} chars)`);
                success++;
            } else {
                console.log(`  ✗ 内容提取失败 (${result ? result.content.length : 'null'} chars)`);
                fail++;
                errors.push(article.title);
            }
        } catch (err) {
            console.log(`  ✗ ${err.message}`);
            fail++;
            errors.push(article.title);
        }

        if (i < articles.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    console.log(`\n=== 完成: ${success} 成功, ${fail} 失败 ===`);
    if (errors.length) {
        console.log(`失败文章: ${errors.join(', ')}`);
    }
}

main().catch(console.error);
