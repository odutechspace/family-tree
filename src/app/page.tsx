import { Snippet } from "@nextui-org/snippet";
import { Code } from "@nextui-org/code";
import { subtitle, title } from "@/src/components/primitives";
import Image from "next/image";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-full">
      <div className="bg-red-600 w-full h-[100vh] fixed top-0 left-0 z-0">
        <Image
          alt={"people"}
          className="w-full h-full object-cover"
          height={2000}
          src="/images/people.png"
          width={2000}
        />
        <div className="w-full h-full absolute bg-gray-100/10 dark:bg-black/70 top-0 left-0 backdrop-blur"/>
      </div>

      <div className="flex flex-col items-center max-w-xl text-center justify-center z-20 mt-20">
        <Image
          alt={"people"}
          className="mb-10"
          height={400}
          src="/logos/uklogo.png"
          width={400}
        />
        <p className="text-white">
          <span className={title()}>Find</span>
          <span className={title()}>Your</span>
        </p>
        <p className={title({ color: "violet", size: "lg" })}>Ukoo&nbsp;</p>
        <div className={subtitle({ class: "mt-4 text-white" })}>
          Discover, Connect, Preserve.
        </div>
      </div>

      <div className="flex gap-3">
        {/*<Link*/}
        {/*  isExternal*/}
        {/*  className={buttonStyles({*/}
        {/*    color: "primary",*/}
        {/*    radius: "full",*/}
        {/*    variant: "shadow"*/}
        {/*  })}*/}
        {/*  href={siteConfig.links.docs}*/}
        {/*>*/}
        {/*  Documentation*/}
        {/*</Link>*/}
        {/*<Link*/}
        {/*  isExternal*/}
        {/*  className={buttonStyles({ variant: "bordered", radius: "full" })}*/}
        {/*  href={siteConfig.links.github}*/}
        {/*>*/}
        {/*  <GithubIcon size={20} />*/}
        {/*  GitHub*/}
        {/*</Link>*/}
      </div>

      <div className="mt-8">
        <Snippet hideCopyButton hideSymbol variant="bordered">
          <span>
            Get started by editing <Code color="primary">app/page.tsx</Code>
          </span>
        </Snippet>
      </div>
    </section>
  );
}
