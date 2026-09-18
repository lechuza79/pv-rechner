/** Some transports do not settle promptly after abort. Stop awaiting them at
 * the deadline as well; native fetch still receives the signal for cancellation. */
export function abortableContactRead<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(Error("Contact read deadline exceeded"));
  return new Promise<T>((resolve,reject)=>{
    const abort = () => { cleanup(); reject(Error("Contact read deadline exceeded")); };
    const cleanup = () => signal.removeEventListener("abort",abort);
    signal.addEventListener("abort",abort,{once:true});
    operation.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
  });
}
