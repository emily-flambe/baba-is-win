import readingTime from 'reading-time'

type Post = {
  title: string
  file: string
  rawContent?: () => string
  compiledContent?: () => string
}

export default function getPostData(post: Post) {
  // Get content - MDX files might not have rawContent
  const content = post.rawContent ? post.rawContent() : 
                  post.compiledContent ? post.compiledContent() : 
                  '';
  
  return {
    slug: post.file.split('/').pop().split('.').shift(),
    readingTime: readingTime(content).text,
  }
}
