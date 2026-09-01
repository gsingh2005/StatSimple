import { jStat } from 'jstat';
export const numeric=(xs:unknown[])=>xs.map(Number).filter(Number.isFinite);
export const mean=(x:number[])=>x.reduce((a,b)=>a+b,0)/x.length;
export const variance=(x:number[])=>x.length<2?0:x.reduce((s,v)=>s+(v-mean(x))**2,0)/(x.length-1);
export const sd=(x:number[])=>Math.sqrt(variance(x));
export const median=(x:number[])=>{const s=[...x].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
export const quantile=(x:number[],p:number)=>{const s=[...x].sort((a,b)=>a-b),q=(s.length-1)*p,lo=Math.floor(q),hi=Math.ceil(q);return s[lo]+(s[hi]-s[lo])*(q-lo)};
export function describe(x:number[]){return {n:x.length,mean:mean(x),median:median(x),sd:sd(x),variance:variance(x),min:Math.min(...x),max:Math.max(...x),q1:quantile(x,.25),q3:quantile(x,.75)}}
export function pearson(x:number[],y:number[]){const n=Math.min(x.length,y.length),a=x.slice(0,n),b=y.slice(0,n),ma=mean(a),mb=mean(b);return a.reduce((s,v,i)=>s+(v-ma)*(b[i]-mb),0)/Math.sqrt(a.reduce((s,v)=>s+(v-ma)**2,0)*b.reduce((s,v)=>s+(v-mb)**2,0))}
export function correlation(x:number[],y:number[]){const r=pearson(x,y),n=Math.min(x.length,y.length),t=r*Math.sqrt((n-2)/(1-r*r));return {r,n,t,df:n-2,p:2*(1-jStat.studentt.cdf(Math.abs(t),n-2))}}
export function oneSampleT(x:number[],mu=0){const d=describe(x),t=(d.mean-mu)/(d.sd/Math.sqrt(d.n));return {...d,t,df:d.n-1,p:2*(1-jStat.studentt.cdf(Math.abs(t),d.n-1))}}
export function independentT(a:number[],b:number[]){const x=describe(a),y=describe(b),se=Math.sqrt(x.variance/x.n+y.variance/y.n),t=(x.mean-y.mean)/se,df=(x.variance/x.n+y.variance/y.n)**2/((x.variance/x.n)**2/(x.n-1)+(y.variance/y.n)**2/(y.n-1));return {t,df,p:2*(1-jStat.studentt.cdf(Math.abs(t),df)),difference:x.mean-y.mean}}
export function linearRegression(x:number[],y:number[]){const r=pearson(x,y),slope=r*sd(y)/sd(x),intercept=mean(y)-slope*mean(x);return {r,r2:r*r,slope,intercept,equation:`y = ${intercept.toFixed(3)} + ${slope.toFixed(3)}x`}}
