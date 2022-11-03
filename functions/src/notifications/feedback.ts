import {db} from "../firebase";
import{getTokensAndSendMessage, addGenericNotification} from "./createFirestoreNotification"


export async function getFeedback() {
    const message = ""

    const userDocs = await db.users.get();

    const promises: any[] = []

    userDocs.docs.map((userDoc)=>{
        const user = userDoc.data()
        promises.push(getTokensAndSendMessage(user.id,message));
        promises.push(addGenericNotification(user.id,message,"   "));
    });
    await Promise.all(promises);
}