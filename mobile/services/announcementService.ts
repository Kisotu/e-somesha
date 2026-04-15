import { api } from "./api";
import { Announcement } from "../types";

export const announcementService = {
  async getCourseAnnouncements(courseId: number): Promise<Announcement[]> {
    const { data } = await api.get<Announcement[]>(`/courses/${courseId}/announcements`);
    return data;
  },
};
