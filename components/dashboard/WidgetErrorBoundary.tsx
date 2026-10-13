'use client';
import {Component,type ReactNode,type ErrorInfo} from 'react';
/** A failed chart must not remove sibling widgets from a dashboard. */
export class WidgetErrorBoundary extends Component<{label:string;children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('Dashboard widget failed',this.props.label,error,info.componentStack);}
 render(){return this.state.failed?<div role="alert" style={{padding:24}}><p>{this.props.label} konnte gerade nicht angezeigt werden.</p><button type="button" onClick={()=>this.setState({failed:false})}>Erneut versuchen</button></div>:this.props.children;}
}
