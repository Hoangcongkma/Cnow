// Chạy ở "prepare" (sau npm install / npm ci). Bỏ qua trên server production (Render: devDependencies không được cài
// nên không có husky) và trên CI (GitHub Actions đặt CI=true; không cần hook git ở đó). Theo hướng dẫn chính thức của husky.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') process.exit(0);
const husky = (await import('husky')).default;
console.log(husky());
