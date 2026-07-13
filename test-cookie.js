const res = new Response('ok', { headers: [['Set-Cookie', 'a=1; expires=Wed, 21 Oct 2015 07:28:00 GMT'], ['Set-Cookie', 'b=2']] });
console.log(res.headers.getSetCookie ? res.headers.getSetCookie() : 'no getSetCookie');
