let context,output;const voices=new Set();
export async function audioContext(){
 if(!context){
  context=new (window.AudioContext||window.webkitAudioContext)();
  // Amplify the whole envelope, including the quiet sustained part of each note.
  output=context.createGain();output.gain.value=9;
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-3;limiter.knee.value=3;limiter.ratio.value=20;
  limiter.attack.value=0;limiter.release.value=.08;
  // Remain linear at normal levels; smoothly round only the highest peaks.
  const ceiling=context.createWaveShaper(),curve=new Float32Array(65537);
  for(let i=0;i<curve.length;i++){
   const x=2*i/(curve.length-1)-1,a=Math.abs(x);
   curve[i]=a<=.85?x:Math.sign(x)*(.85+.1*Math.tanh((a-.85)/.1));
  }
  ceiling.curve=curve;ceiling.oversample='4x';
  output.connect(limiter);limiter.connect(ceiling);ceiling.connect(context.destination);
 }
 if(context.state==='suspended')await context.resume();return context;
}
function sound(ctx,midi,start,duration,volume=.15){
 const freq=440*Math.pow(2,(midi-69)/12);const gain=ctx.createGain();gain.connect(output);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.05,start+Math.min(.2,duration*.5));gain.gain.exponentialRampToValueAtTime(.0001,start+duration+.18);
 for(const [multiple,level]of [[1,1],[2,.35],[3,.12]]){const osc=ctx.createOscillator(),part=ctx.createGain();osc.type='sine';osc.frequency.value=freq*multiple;part.gain.value=level;osc.connect(part);part.connect(gain);osc.start(start);osc.stop(start+duration+.2);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();part.disconnect()}}
 setTimeout(()=>gain.disconnect(),Math.max(0,(start-ctx.currentTime+duration+.3)*1000));
}
export async function playNotes(notes,{tempo=65,durations=[],chord=false,gap=.15}={}){const ctx=await audioContext();stopAudio();let t=ctx.currentTime+.05;for(let i=0;i<notes.length;i++){const d=(durations[i]||1)*60/tempo;sound(ctx,notes[i],chord?ctx.currentTime+.05:t,d);if(!chord)t+=d+gap}return (chord?60/tempo:t-ctx.currentTime)*1000}
export function stopAudio(){for(const osc of voices){try{osc.stop()}catch{}}voices.clear()}
