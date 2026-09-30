// Local Vercel ingress model: caller headers are removed and replaced here.
// This fixture does not claim to execute the Vercel platform.
import {createServer,request} from 'node:http';
import {connect} from 'node:net';
import {randomBytes} from 'node:crypto';
let origin='192.0.2.1';
function rotate(){const b=randomBytes(2);origin=`198.18.${b[0]}.${b[1]}`;}
rotate();
const server=createServer(async(req,res)=>{
  if(req.url==='/__fixture/rotate-origin'&&req.method==='POST'){rotate();res.end('{}');return;}
  if(req.url==='/__fixture/health'){res.end('{}');return;}
  const headers={...req.headers};delete headers['x-forwarded-for'];delete headers['x-real-ip'];delete headers['x-vercel-forwarded-for'];headers['x-vercel-forwarded-for']=origin;
  const upstream=request({hostname:'127.0.0.1',port:3100,path:req.url,method:req.method,headers},response=>{res.writeHead(response.statusCode!,response.headers);response.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
});
// Next dev waits for its HMR WebSocket before hydrating Client Components.
server.on('upgrade',(req,socket,head)=>{
  const upstream=connect(3100,'127.0.0.1',()=>{
    upstream.write(`GET ${req.url} HTTP/1.1\r\n${Object.entries(req.headers).map(([key,value])=>`${key}: ${value}`).join('\r\n')}\r\n\r\n`);
    if(head.length)upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
});
server.listen(3102,'127.0.0.1');
