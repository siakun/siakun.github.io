export interface SocialLink {
  label: string;
  url: string;
}

export interface Profile {
  avatar: string;
  name: string;
  title: string;
  subtitle: string;
  email: string;
  location: string;
  links: SocialLink[];
}

export const profile: Profile = {
  avatar: 'https://avatars.githubusercontent.com/u/18740181',
  name: 'Soung-Gyu Jin',
  title: 'Software Engineer',
  subtitle: '실수하기 어려운 구조를 설계하는 개발자',
  email: 'lunasia819@gmail.com',
  location: 'Seoul, South Korea',
  links: [
    { label: 'GitHub', url: 'https://github.com/siakun' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/soung-gyu-jin/' },
  ],
};
