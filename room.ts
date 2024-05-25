import { RoomInterface } from "@juzi/wechaty/impls";

export interface ChatRoom {
    roomName: string;
    room: RoomInterface;
}

const useRoom = () => {

    let roomList: ChatRoom[] = [];

    const setRoomList = (_roomList: ChatRoom[]) => {
        roomList = _roomList;
    }

    const getRoomByTopic = (topic: string) => {
        for (let i = 0; i < roomList.length; i++) {
            const room = roomList[i];
            if (room.roomName === topic) {
                return room;
            }
        }
        return null;
    }

    return {
        setRoomList,
        getRoomByTopic
    };

}
export default useRoom;