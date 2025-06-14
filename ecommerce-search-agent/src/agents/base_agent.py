from typing import Any, Dict, List, Optional, TypeVar, Union
from pydantic import BaseModel, Field, validator

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

class AgentConfig(BaseModel):
    """Configuration for the base agent."""
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1000, ge=64, le=4000)
    max_iterations: int = Field(default=5, ge=1, le=10)
    verbose: bool = Field(default=True)

    @validator('temperature')
    def validate_temperature(cls, v: float) -> float:
        """Validate temperature field."""
        if v < 0.0 or v > 1.0:
            raise ValueError("temperature must be between 0.0 and 1.0")
        return v

class BaseAgent:
    """Base agent class for all agents in the system."""

    def __init__(
        self,
        tools: List[BaseTool],
        system_prompt: str,
        model_name: str = "gpt-4-turbo-preview",
        config: Optional[AgentConfig] = None,
    ):
        """
        Initialize the base agent.
        
        Args:
            tools: List of tools available to the agent
            system_prompt: System prompt for the agent
            model_name: Name of the OpenAI model to use
            config: Optional configuration for the agent
        """
        if not tools or not isinstance(tools, list):
            raise ValueError("tools must be a non-empty list")
        if not system_prompt or not isinstance(system_prompt, str):
            raise ValueError("system_prompt must be a non-empty string")
        
        self.tools = tools
        self.system_prompt = system_prompt
        self.model_name = model_name
        self.config = config or AgentConfig()

        # Create the agent
        self.agent = self._create_agent()
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=tools,
            verbose=self.config.verbose,
            handle_parsing_errors=True,
            max_iterations=self.config.max_iterations,
        )

    def _create_agent(self) -> Any:
        """
        Create the agent with tools and prompt.
        
        Returns:
            Configured agent instance
        """
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
        )
        return prompt | llm | OpenAIFunctionsAgentOutputParser()

    async def run(
        self,
        input_text: str,
        chat_history: Optional[List[BaseMessage]] = None,
    ) -> Dict[str, Any]:
        """
        Run the agent with the given input.
        
        Args:
            input_text: The input text to process
            chat_history: Optional list of previous messages for context
            
        Returns:
            Dict containing the agent's response and any additional data
            
        Raises:
            ValueError: If the input is invalid
            Exception: For other errors during processing
        """
        if not input_text or not isinstance(input_text, str):
            raise ValueError("input_text must be a non-empty string")
        
        try:
            logger.info(
                "Running agent",
                input=input_text,
                chat_history_length=len(chat_history) if chat_history else 0,
            )
            
            # Use the agent executor directly
            result = await self.agent_executor.ainvoke({
                "input": input_text,
                "chat_history": chat_history or [],
            })
            
            logger.info(
                "Agent execution completed",
                output=result,
            )
            return result
        except Exception as e:
            logger.error("Error running agent", error=str(e))
            raise 