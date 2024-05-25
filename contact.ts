import { ContactInterface } from "@juzi/wechaty/impls";
import { DB_HOST } from "./constant";

export interface Friend {
    id: string;
    name: string;
    alias: string;
    contact: ContactInterface;
}

interface User {
    userName: string;
    wechatName: string;
}

const useContact = () => {

    let contactList: Friend[];
    let wechatToUserMap: Map<string, string> = new Map();
    const getContactList = () => {
        return contactList;
    }

    const setContactList = (_contactList: any) => {
        contactList = _contactList;
        updateAlias();
        // console.log("contact list updated", contactList);

    }

    const updateUserInfo = async () => {
        fetch(`${DB_HOST}/user/findAll`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch user info HTTP error! status: ${response.status}`);
                }
                return response.json() as Promise<User[]>;
            })
            .then((userInfo: User[]) => {
                userInfo.forEach((user: any) => {
                    if (user.wechatName && user.userName) {
                        wechatToUserMap.set(user.wechatName.trim(), user.userName.trim());
                    }
                });
                updateAlias();
            })
            .catch(error => {
                console.error(error);
            });
    }

    function updateAlias() {
        if (!contactList) {
            return;
        }
        // console.log(contactList)
        wechatToUserMap.forEach((userName, wechatName) => {
            // console.log(wechatName, userName)
            for (let i = 0; i < contactList.length; i++) {
                const contact = contactList[i];
                if (contact.name == wechatName && contact.alias != userName) {
                    contact.alias = userName;
                    contact.contact.alias(userName);
                    contactList[i] = contact;
                    console.log('uspdate alias for ', contact.name, ' to ', userName)
                }
            }
        });
    }

    const getContactByAlias = (alias: string) => {
        return contactList.find((contact) => contact.alias === alias);
    }

    return {
        getContactList,
        getContactByAlias,
        setContactList,
        updateUserInfo
    }


}

export default useContact;