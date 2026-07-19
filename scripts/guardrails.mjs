const NG_WORDS = ["死ね", "殺す", "馬鹿", "アホ", "クソ", "fuck", "shit"];
const MIN_LENGTH = 30;

export function checkPost(title, body) {
  const problems = [];

  if (!title || !title.trim()) {
    problems.push("タイトルが空です。");
  }

  if (!body || body.trim().length < MIN_LENGTH) {
    problems.push(`本文が短すぎます(${MIN_LENGTH}文字以上にしてください)。`);
  }

  const combined = `${title}\n${body}`;
  for (const word of NG_WORDS) {
    if (combined.includes(word)) {
      problems.push(`NGワードを含んでいます: "${word}"`);
    }
  }

  return problems;
}
