from typing import Any, Dict, List, Optional, TypeVar, Union

from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AgentAction, AgentFinish, BaseMessage
from langchain.tools import BaseTool
from langchain.tools.render import format_tool_to_openai_function
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI

from src.utils.logger import get_logger

logger = get_logger(__name__)

StateType = TypeVar("StateType", bound=Dict[str, Any])


class BaseAgent:
    """Base agent class for all agents in the system."""

    def __init__(
        self,
        tools: List[BaseTool],
        system_prompt: str,
        model_name: str = "gpt-4-turbo-preview",
    ):
        """Initialize the base agent."""
        self.tools = tools
        self.system_prompt = system_prompt
        self.model_name = model_name

        # Create the agent
        self.agent = self._create_agent()
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True,
        )

    def _create_agent(self) -> Any:
        """Create the agent with tools and prompt."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        llm = ChatOpenAI(model=self.model_name)
        return prompt | llm | OpenAIFunctionsAgentOutputParser()

    async def run(
        self,
        input_text: str,
        chat_history: Optional[List[BaseMessage]] = None,
    ) -> Dict[str, Any]:
        """Run the agent with the given input."""
        try:
            # Use the agent executor directly
            result = await self.agent_executor.ainvoke({
                "input": input_text,
                "chat_history": chat_history or [],
            })
            return result
        except Exception as e:
            logger.error("Error running agent", error=str(e))
            raise 