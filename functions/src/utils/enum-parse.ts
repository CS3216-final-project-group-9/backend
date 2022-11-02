import {PostLocation} from "../type/post";


export function parseLocation(location: PostLocation) {
  switch (location) {
    case PostLocation.BIZ:
      return "Business School";
    case PostLocation.CLB:
      return "Central Library";
    case PostLocation.ENGINEERING:
      return "Faculty of Engineering (CDE)";
    case PostLocation.FASS:
      return "Faculty of Arts and Social Science (CHS)";
    case PostLocation.LAW:
      return "Faculty of Law";
    case PostLocation.SCIENCE:
      return "Faculty of Science (CHS)";
    case PostLocation.SDE:
      return "School of Design and Environment (CDE)";
    case PostLocation.SOC:
      return "School of Computing";
    case PostLocation.UTOWN:
      return "Utown";
    default:
      return "NUS";
  }
}
