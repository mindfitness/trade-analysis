export const onRequest: PagesFunction<{ BASIC_USER: string; BASIC_PASS: string }> = async (context) => {
  const { request, next, env } = context;
  const authorization = request.headers.get('Authorization');

  // Cloudflareの環境変数からユーザー名とパスワードを取得
  const USERNAME = env.BASIC_USER;
  const PASSWORD = env.BASIC_PASS;

  // 環境変数が設定されていない場合は、安全のためアクセスをブロック
  if (!USERNAME || !PASSWORD) {
    return new Response('Server configuration error: Missing credentials.', { status: 500 });
  }

  if (authorization) {
    const encoded = authorization.split(' ')[1];
    const decoded = atob(encoded);
    const [user, pass] = decoded.split(':');

    if (user === USERNAME && pass === PASSWORD) {
      return await next();
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
};
