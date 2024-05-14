import { ContactInterface } from "@juzi/wechaty/impls";

export interface Friend {
    id: string;
    name: string;
    alias: string;
    contact: ContactInterface;
}

const useContact = () => {

    let contactList:Friend[];
    
    const getContactList = () => {
        return contactList;
    }

    const setContactList = (_contactList: any) => {
        contactList = _contactList;
        // console.log("contact list updated", contactList);

    }

    const getContactByAlias = (alias: string) => {
        return contactList.find((contact) => contact.alias === alias);
    }

    return {
        getContactList,
        getContactByAlias,
        setContactList
    }


}

export default useContact;