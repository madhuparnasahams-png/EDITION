// Discovery taxonomy only. Article tags are free-form and are NOT limited to this list.
// Modelled on how Substack, Medium and Tumblr organise writing: what a piece IS
// (its form) and what it is ABOUT (its subject).
export const FORMS = [
  'Essay', 'Fiction', 'Poetry', 'Zine', 'Memoir', 'Interview', 'Review',
  'Criticism', 'Photo Essay', 'Comics', 'Podcast', 'Video', 'Music',
];

export const SUBJECTS = [
  'Art & Illustration', 'Photography', 'Design', 'Fashion & Beauty', 'Film & TV',
  'Books & Literature', 'Travel', 'Food & Drink', 'Technology', 'Science',
  'Nature & Climate', 'History', 'Culture', 'Philosophy', 'Health & Wellness',
  'Education', 'Humour', 'Sports', 'Games', 'Business',
];

export const ALL_TAGS = [...FORMS, ...SUBJECTS];
