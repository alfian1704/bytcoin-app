import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, isAdmin, supabaseAdmin } from "@/lib/server";

async function adminContext(){
  const user=await getTelegramUser();
  if(!isAdmin(user.id)) throw new Error("Administrator access required");
  return {user,db:supabaseAdmin()};
}
export async function GET(){
  try{const {db}=await adminContext();const {data,error}=await db.from("tasks").select("*").order("created_at",{ascending:false});if(error)throw error;return NextResponse.json({tasks:data||[]});}
  catch(e){return NextResponse.json({error:errMsg(e,"Forbidden")},{status:403});}
}
export async function POST(req:Request){
  try{
    const {user,db}=await adminContext();const body=await req.json();
    const row={slug:String(body.slug||"").trim(),title:String(body.title||"").trim(),description:String(body.description||""),reward_nano:String(body.reward_nano||"0"),task_type:String(body.task_type||"manual"),target_url:body.target_url?String(body.target_url):null,active:Boolean(body.active)};
    if(!row.slug||!row.title||!/^\d+$/.test(row.reward_nano))throw new Error("Valid slug, title and non-negative nanoBYC reward are required");
    const {data,error}=await db.from("tasks").insert(row).select().single();if(error)throw error;
    await db.from("audit_logs").insert({actor_telegram_id:String(user.id),action:"task_created",target_type:"task",target_id:data.id,after_data:data});
    return NextResponse.json({task:data});
  }catch(e){return NextResponse.json({error:errMsg(e,"Unable to create task")},{status:400});}
}
export async function PATCH(req:Request){
  try{
    const {user,db}=await adminContext();const body=await req.json();const id=String(body.id||"");if(!id)throw new Error("Task id required");
    const {data:before,error:readError}=await db.from("tasks").select("*").eq("id",id).single();if(readError)throw readError;
    const allowed=["title","description","reward_nano","task_type","target_url","active","starts_at","ends_at","max_claims","per_user_limit"];
    const patch:Record<string,unknown>={};for(const key of allowed)if(body[key]!==undefined)patch[key]=body[key];
    if(patch.reward_nano!==undefined&&!/^\d+$/.test(String(patch.reward_nano)))throw new Error("Reward must be a non-negative nanoBYC integer");
    patch.updated_at=new Date().toISOString();
    const {data,error}=await db.from("tasks").update(patch).eq("id",id).select().single();if(error)throw error;
    await db.from("audit_logs").insert({actor_telegram_id:String(user.id),action:"task_updated",target_type:"task",target_id:id,before_data:before,after_data:data});
    return NextResponse.json({task:data});
  }catch(e){return NextResponse.json({error:errMsg(e,"Unable to update task")},{status:400});}
}
