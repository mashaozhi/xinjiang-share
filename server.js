const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 80;
const ENV = "xinjiang-trip-d6gij2csc6920ba77";
const TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImFlMTM1ZWM5LTE4YTYtNDUzNC04ZTI0LTdlZTZhZDZkYTFhYSJ9.eyJpc3MiOiJodHRwczovL3hpbmppYW5nLXRyaXAtZDZnaWoyY3NjNjkyMGJhNzcuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InhpbmppYW5nLXRyaXAtZDZnaWoyY3NjNjkyMGJhNzciLCJleHAiOjQwOTE5NDQ4NDUsImlhdCI6MTc4ODI2MTY0NSwibm9uY2UiOiJPRHczNGdURVI5LVFma2Y0OS13Q3NBIiwiYXRfaGFzaCI6Ik9EdzM0Z1RFUjktUWZrZjQ5LXdDc0EiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoieGluamlhbmctdHJpcC1kNmdpajJjc2M2OTIwYmE3NyIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.EIGSXaAPAafLZsA13WKfk_7y9Z9l2GHP5uiujU12IPyfcNl-qAxx3Ojf2aiIIvpM77fvtPx1wwGAUMKoU5Ph_QtIXahebdkOsPmIKv--BlNB3DKVEfEXmiTEDpSf70_a7bxj8rmKYPxyy4HKy8oHSPzJdWqLwf91lNvT7fyMo-RKzHKZWEFNKt5VfshB1MBSCAcAKTZNVwkfMhpseeHaA9LEhA2GlqFy8FjtjgIrOTc_GiRegPiYuQu8HeB8cTNff4eaK8_-CW00v7a2YooRoRSjzwltw3hIpTCMSFzC7cgT4v7B1ooLIZ8bfj1hvZVGSHapIhkpuxSgQyGrQT-7Zg";
const DB = `https://${ENV}.api.tcloudbasegateway.com/v1/rdb/rest/trip_items`;

async function dbFetch(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function sendJson(res, code, body) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');

    if (u.pathname === '/api/items' && req.method === 'GET') {
      const data = await dbFetch(DB + '?select=*&order=created_at.asc');
      return sendJson(res, 200, Array.isArray(data) ? data : []);
    }

    if (u.pathname === '/api/items' && req.method === 'POST') {
      let body=''; for await (const c of req) body += c;
      const data = JSON.parse(body || '{}');
      await dbFetch(DB, {
        method:'POST',
        headers:{'Prefer':'return=minimal'},
        body:JSON.stringify(data)
      });
      return sendJson(res, 200, {ok:true});
    }

    if (u.pathname.startsWith('/api/items/') && (req.method === 'PATCH' || req.method === 'DELETE')) {
      const id = decodeURIComponent(u.pathname.slice('/api/items/'.length));
      if (req.method === 'PATCH') {
        let body=''; for await (const c of req) body += c;
        await dbFetch(DB + '?id=eq.' + encodeURIComponent(id), {
          method:'PATCH',
          headers:{'Prefer':'return=minimal'},
          body:body || '{}'
        });
      } else {
        await dbFetch(DB + '?id=eq.' + encodeURIComponent(id), {
          method:'DELETE',
          headers:{'Prefer':'return=minimal'}
        });
      }
      return sendJson(res, 200, {ok:true});
    }

    let pathname = u.pathname === '/' ? '/index.html' : u.pathname;
    const filePath = path.join(__dirname, pathname.replace(/^\/+/, ''));
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403); return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not Found'); }
      const ext = path.extname(filePath).toLowerCase();
      const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
      res.writeHead(200, {'Content-Type':types[ext] || 'application/octet-stream','Cache-Control':'no-cache'});
      res.end(data);
    });
  } catch (e) {
    console.error(e);
    sendJson(res, 500, {error:String(e.message || e)});
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`xinjiang-share listening on ${PORT}`));
