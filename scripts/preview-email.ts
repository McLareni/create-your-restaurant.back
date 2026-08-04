import * as http from 'node:http';
import { getEmailVerificationTemplate } from 'src/users/templates/email-verification.template';

const server = http.createServer((_req, res) => {
  const title = 'Ваш код доступу до Gustio';
  const mockCode = '123456';
  const htmlContent = getEmailVerificationTemplate(title, mockCode);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlContent);
});

server.listen(3002, () => {
  process.stdout.write('Email preview server running at http://localhost:3002\n');
});